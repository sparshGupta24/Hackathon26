import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseCarTemplateId } from "@/lib/carSvgs";
import { DEFAULT_BASE_DURATION_SEC, TEAM_LIMIT, TEAM_ROLES } from "@/lib/constants";
import { getDb } from "@/lib/firebaseAdmin";
import { resolvePeopleByIds } from "@/lib/firestore/people";
import { getRemainingSeconds, shouldAutoEnd, totalDurationSec } from "@/lib/timer";
import type { EventStateResponse, RaceUpdateState, TeamState, TimerState, TimerStatus } from "@/lib/types";

const COL_CONFIG = "config";
const DOC_TIMER = "eventTimer";
const DOC_RACE = "raceUpdate";
const COL_TEAMS = "teams";

function timestampOrNow(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

function timerDataToCore(data: Record<string, unknown>) {
  const started = data.startedAt;
  return {
    status: (data.status as TimerStatus) ?? "idle",
    startedAt: started instanceof Timestamp ? started.toDate() : null,
    baseDurationSec: Number(data.baseDurationSec ?? DEFAULT_BASE_DURATION_SEC),
    extendedSec: Number(data.extendedSec ?? 0)
  };
}

function toTimerState(timerData: Record<string, unknown>, updatedAt: Date): TimerState {
  const core = timerDataToCore(timerData);
  return {
    status: core.status,
    startedAt: core.startedAt ? core.startedAt.toISOString() : null,
    baseDurationSec: core.baseDurationSec,
    extendedSec: core.extendedSec,
    updatedAt: updatedAt.toISOString(),
    totalDurationSec: totalDurationSec(core),
    remainingSec: getRemainingSeconds(core)
  };
}

function defaultTimerFields() {
  return {
    status: "idle" as const,
    startedAt: null,
    baseDurationSec: DEFAULT_BASE_DURATION_SEC,
    extendedSec: 0
  };
}

function defaultRaceFields() {
  return {
    teamId: null as string | null,
    teamName: "Race Control",
    message: "Race control online",
    delta: 0,
    accentColor: "#FFFFFF"
  };
}

function docToTeamState(doc: QueryDocumentSnapshot): TeamState {
  const d = doc.data();
  const createdAt = timestampOrNow(d.createdAt).toISOString();
  const rawPlayers = Array.isArray(d.players) ? d.players : [];
  const players = rawPlayers.map(
    (p: { id?: string; name?: string; slot?: number; photoUrl?: string; roleTitle?: string }) => ({
      id: String(p.id ?? randomUUID()),
      name: String(p.name ?? ""),
      slot: Number(p.slot ?? 0),
      ...(typeof p.photoUrl === "string" && p.photoUrl ? { photoUrl: p.photoUrl } : {}),
      ...(typeof p.roleTitle === "string" && p.roleTitle ? { roleTitle: p.roleTitle } : {})
    })
  );
  const livery = d.livery;
  return {
    id: doc.id,
    name: String(d.name ?? ""),
    progress: typeof d.progress === "number" ? d.progress : 0,
    createdAt,
    players,
    livery:
      livery && typeof livery === "object"
        ? {
            carTemplate: parseCarTemplateId(livery.carTemplate) ?? "01",
            primaryColor: String(livery.primaryColor ?? ""),
            secondaryColor: String(livery.secondaryColor ?? ""),
            tertiaryColor: String(livery.tertiaryColor ?? "#8D99AE"),
            carNumber: Number(livery.carNumber ?? 0)
          }
        : null
  };
}

export async function getEventState(): Promise<EventStateResponse> {
  const db = getDb();
  const timerRef = db.collection(COL_CONFIG).doc(DOC_TIMER);
  const raceRef = db.collection(COL_CONFIG).doc(DOC_RACE);

  return db.runTransaction(async (transaction) => {
    const [timerSnap, raceSnap, teamsSnap] = await Promise.all([
      transaction.get(timerRef),
      transaction.get(raceRef),
      transaction.get(db.collection(COL_TEAMS).orderBy("createdAt", "asc"))
    ]);

    let timerData: Record<string, unknown>;
    let timerUpdatedAt: Date;

    if (!timerSnap.exists) {
      transaction.set(timerRef, {
        ...defaultTimerFields(),
        updatedAt: FieldValue.serverTimestamp()
      });
      timerData = { ...defaultTimerFields() };
      timerUpdatedAt = new Date();
    } else {
      timerData = { ...timerSnap.data()! };
      timerUpdatedAt = timestampOrNow(timerData.updatedAt);
    }

    const core = timerDataToCore(timerData);
    if (shouldAutoEnd(core)) {
      transaction.update(timerRef, {
        status: "ended",
        updatedAt: FieldValue.serverTimestamp()
      });
      timerData = { ...timerData, status: "ended" };
      timerUpdatedAt = new Date();
    }

    let raceData: Record<string, unknown>;
    let raceUpdatedAt: Date;

    if (!raceSnap.exists) {
      transaction.set(raceRef, {
        ...defaultRaceFields(),
        updatedAt: FieldValue.serverTimestamp()
      });
      raceData = { ...defaultRaceFields() };
      raceUpdatedAt = new Date();
    } else {
      raceData = { ...raceSnap.data()! };
      raceUpdatedAt = timestampOrNow(raceData.updatedAt);
    }

    const teams = teamsSnap.docs.map((d) => docToTeamState(d));

    const raceUpdate: RaceUpdateState = {
      teamId: (raceData.teamId as string | null) ?? null,
      teamName: String(raceData.teamName ?? "Race Control"),
      message: String(raceData.message ?? ""),
      delta: Number(raceData.delta ?? 0),
      accentColor: String(raceData.accentColor ?? "#FFFFFF"),
      updatedAt: raceUpdatedAt.toISOString()
    };

    return {
      teams,
      timer: toTimerState(timerData, timerUpdatedAt),
      raceUpdate,
      serverTime: new Date().toISOString()
    };
  });
}

export async function registerTeam(input: {
  teamName: string;
  playerIds: string[];
  livery: {
    carTemplate: string;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    carNumber: number;
  };
}): Promise<void> {
  const people = await resolvePeopleByIds(input.playerIds);
  const db = getDb();
  await db.runTransaction(async (transaction) => {
    const teamsSnap = await transaction.get(db.collection(COL_TEAMS).orderBy("createdAt", "asc"));
    if (teamsSnap.size >= TEAM_LIMIT) {
      throw new Error("TEAM_LIMIT_REACHED");
    }
    const teamRef = db.collection(COL_TEAMS).doc();
    transaction.set(teamRef, {
      name: input.teamName,
      progress: 0,
      createdAt: FieldValue.serverTimestamp(),
      players: people.map((person, index) => ({
        id: person.id,
        name: person.name,
        photoUrl: person.photoUrl,
        slot: index + 1,
        roleTitle: TEAM_ROLES[index]?.title ?? ""
      })),
      livery: {
        carTemplate: input.livery.carTemplate,
        primaryColor: input.livery.primaryColor,
        secondaryColor: input.livery.secondaryColor,
        tertiaryColor: input.livery.tertiaryColor,
        carNumber: input.livery.carNumber
      }
    });
  });
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

function brightness(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function brightestColor(colors: string[]) {
  return colors.reduce((best, next) => (brightness(next) > brightness(best) ? next : best));
}

export async function updateTeamProgress(input: {
  teamId: string;
  delta: 1 | -1;
  message: string;
}): Promise<void> {
  const db = getDb();
  const raceRef = db.collection(COL_CONFIG).doc(DOC_RACE);
  const MAX_PROGRESS = 100;

  await db.runTransaction(async (transaction) => {
    const teamRef = db.collection(COL_TEAMS).doc(input.teamId);
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const data = teamSnap.data()!;
    const progress = typeof data.progress === "number" ? data.progress : 0;
    const nextProgress = Math.max(0, Math.min(MAX_PROGRESS, progress + input.delta));
    const livery = data.livery as Record<string, string> | undefined;
    const accentColor = livery
      ? brightestColor([livery.primaryColor, livery.secondaryColor, livery.tertiaryColor])
      : "#FFFFFF";

    transaction.update(teamRef, { progress: nextProgress });
    transaction.set(
      raceRef,
      {
        teamId: input.teamId,
        teamName: String(data.name ?? ""),
        message: input.message,
        delta: input.delta,
        accentColor,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

export async function startTimerRunning(): Promise<void> {
  const db = getDb();
  await db.collection(COL_CONFIG).doc(DOC_TIMER).set(
    {
      status: "running",
      startedAt: FieldValue.serverTimestamp(),
      baseDurationSec: DEFAULT_BASE_DURATION_SEC,
      extendedSec: 0,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function resetTimer(): Promise<void> {
  const db = getDb();
  await db.collection(COL_CONFIG).doc(DOC_TIMER).set(
    {
      ...defaultTimerFields(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function extendTimerWhileRunning(minutes: 5 | 10): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COL_CONFIG).doc(DOC_TIMER);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      return false;
    }
    if (snap.data()!.status !== "running") {
      return false;
    }
    transaction.update(ref, {
      extendedSec: FieldValue.increment(minutes * 60),
      updatedAt: FieldValue.serverTimestamp()
    });
    return true;
  });
}

export async function pauseTimer(): Promise<void> {
  const db = getDb();
  const ref = db.collection(COL_CONFIG).doc(DOC_TIMER);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      return;
    }
    const data = snap.data()!;
    const core = timerDataToCore(data);
    const remaining =
      core.status === "running" ? getRemainingSeconds(core, Date.now()) : core.baseDurationSec + core.extendedSec;
    transaction.update(ref, {
      status: "idle",
      startedAt: null,
      baseDurationSec: Math.max(0, remaining),
      extendedSec: 0,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
}

export async function resumeTimer(): Promise<void> {
  const db = getDb();
  const ref = db.collection(COL_CONFIG).doc(DOC_TIMER);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      return;
    }
    if (snap.data()!.status === "running") {
      return;
    }
    transaction.update(ref, {
      status: "running",
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
}

export async function publicExtendTimerBase(minutes: 5 | 10): Promise<void> {
  const db = getDb();
  const ref = db.collection(COL_CONFIG).doc(DOC_TIMER);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      transaction.set(ref, {
        status: "idle",
        startedAt: null,
        baseDurationSec: minutes * 60,
        extendedSec: 0,
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      transaction.update(ref, {
        baseDurationSec: FieldValue.increment(minutes * 60),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });
}
