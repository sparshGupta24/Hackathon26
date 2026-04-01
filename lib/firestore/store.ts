import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseCarTemplateId } from "@/lib/carSvgs";
import { DEFAULT_BASE_DURATION_SEC, TEAM_LIMIT, TEAM_ROLES } from "@/lib/constants";
import { composeRegistrationPrompt, isValidPermutationIndex } from "@/lib/promptPermutations";
import { getDb } from "@/lib/firebaseAdmin";
import { COL_PEOPLE, resolvePeopleByIds } from "@/lib/firestore/people";
import { getRemainingSeconds, shouldAutoEnd, totalDurationSec } from "@/lib/timer";
import type {
  EventStateResponse,
  RaceUpdateState,
  TeamState,
  TimerState,
  TimerStatus,
  VolunteerAwardSelection,
  VolunteerRewardsState
} from "@/lib/types";
import {
  VOLUNTEER_AWARDS,
  type VolunteerAwardKey,
  type VolunteerRewardsPayload
} from "@/lib/volunteerRewards";

const COL_CONFIG = "config";
const DOC_TIMER = "eventTimer";
const DOC_RACE = "raceUpdate";
const DOC_VOLUNTEER_REWARDS = "volunteerRewards";
const COL_TEAMS = "teams";

function timestampOrNow(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date();
}

function parseStartedAt(started: unknown): Date | null {
  if (started instanceof Timestamp) {
    return started.toDate();
  }
  if (typeof started === "string" && started.length > 0) {
    const d = new Date(started);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (started instanceof Date && !Number.isNaN(started.getTime())) {
    return started;
  }
  return null;
}

function timerDataToCore(data: Record<string, unknown>) {
  const baseRaw = Number(data.baseDurationSec);
  const baseDurationSec =
    Number.isFinite(baseRaw) && baseRaw >= 0 ? baseRaw : DEFAULT_BASE_DURATION_SEC;
  const extRaw = Number(data.extendedSec);
  const extendedSec = Number.isFinite(extRaw) && extRaw >= 0 ? extRaw : 0;
  return {
    status: (data.status as TimerStatus) ?? "idle",
    startedAt: parseStartedAt(data.startedAt),
    baseDurationSec,
    extendedSec
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
    remainingSec: getRemainingSeconds(core),
    startCeremonyPending: timerData.startCeremonyPending === true
  };
}

function defaultTimerFields() {
  return {
    status: "idle" as const,
    startedAt: null,
    baseDurationSec: DEFAULT_BASE_DURATION_SEC,
    extendedSec: 0,
    startCeremonyPending: true
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

function playerIdsFromTeamDocs(docs: QueryDocumentSnapshot[]): string[] {
  const ids = new Set<string>();
  for (const doc of docs) {
    const raw = doc.data().players;
    if (!Array.isArray(raw)) {
      continue;
    }
    for (const p of raw) {
      const id = (p as { id?: unknown })?.id;
      if (typeof id === "string" && id.trim()) {
        ids.add(id.trim());
      }
    }
  }
  return [...ids];
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
  const challengePrompt =
    typeof d.challengePrompt === "string" && d.challengePrompt.trim() ? String(d.challengePrompt) : undefined;
  const promptSpinsUsed =
    typeof d.promptSpinsUsed === "number" && Number.isFinite(d.promptSpinsUsed) ? d.promptSpinsUsed : undefined;
  const rawPermIdx = d.promptPermutationIndex;
  const promptPermutationIndex =
    typeof rawPermIdx === "number" && isValidPermutationIndex(rawPermIdx) ? rawPermIdx : undefined;
  const missionStatement =
    typeof d.missionStatement === "string" ? String(d.missionStatement) : undefined;
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
        : null,
    ...(challengePrompt ? { challengePrompt } : {}),
    ...(promptPermutationIndex !== undefined ? { promptPermutationIndex } : {}),
    ...(promptSpinsUsed !== undefined ? { promptSpinsUsed } : {}),
    ...(missionStatement !== undefined ? { missionStatement } : {})
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

    const rosterIds = playerIdsFromTeamDocs(teamsSnap.docs);
    const peopleSnaps =
      rosterIds.length > 0
        ? await Promise.all(rosterIds.map((id) => transaction.get(db.collection(COL_PEOPLE).doc(id))))
        : [];
    const photoById = new Map<string, string>();
    for (const snap of peopleSnaps) {
      if (snap.exists) {
        const url = snap.data()?.photoUrl;
        if (typeof url === "string" && url.length > 0) {
          photoById.set(snap.id, url);
        }
      }
    }

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

    let core = timerDataToCore(timerData);

    if (core.status === "running" && core.startedAt === null) {
      transaction.update(timerRef, {
        status: "idle",
        startedAt: null,
        startCeremonyPending: true,
        updatedAt: FieldValue.serverTimestamp()
      });
      timerData = { ...timerData, status: "idle", startedAt: null, startCeremonyPending: true };
      timerUpdatedAt = new Date();
      core = timerDataToCore(timerData);
    }

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

    const teams = teamsSnap.docs.map((d) => {
      const base = docToTeamState(d);
      return {
        ...base,
        players: base.players.map((pl) => {
          const fromRoster = photoById.get(pl.id);
          const photoUrl =
            typeof fromRoster === "string" && fromRoster.length > 0 ? fromRoster : pl.photoUrl;
          if (photoUrl) {
            return { ...pl, photoUrl };
          }
          const { photoUrl: _drop, ...rest } = pl;
          return rest;
        })
      };
    });

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
}): Promise<string> {
  const people = await resolvePeopleByIds(input.playerIds);
  const db = getDb();
  return db.runTransaction(async (transaction) => {
    const teamsSnap = await transaction.get(db.collection(COL_TEAMS).orderBy("createdAt", "asc"));
    if (teamsSnap.size >= TEAM_LIMIT) {
      throw new Error("TEAM_LIMIT_REACHED");
    }
    const teamRef = db.collection(COL_TEAMS).doc();
    transaction.set(teamRef, {
      name: input.teamName,
      progress: 0,
      createdAt: FieldValue.serverTimestamp(),
      /* Omit photoUrl here — inline/base64 roster photos can exceed Firestore’s ~1 MiB doc limit if duplicated. */
      players: people.map((person, index) => ({
        id: person.id,
        name: person.name,
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
    return teamRef.id;
  });
}

export async function setTeamChallengePrompt(input: { teamId: string; permutationIndex: number }): Promise<void> {
  const db = getDb();
  await db.runTransaction(async (transaction) => {
    const teamRef = db.collection(COL_TEAMS).doc(input.teamId);
    const teamsQuery = db.collection(COL_TEAMS).orderBy("createdAt", "asc");
    const [teamSnap, teamsSnap] = await Promise.all([transaction.get(teamRef), transaction.get(teamsQuery)]);
    if (!teamSnap.exists) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const data = teamSnap.data()!;
    const existing = data.challengePrompt;
    if (typeof existing === "string" && existing.trim().length > 0) {
      throw new Error("CHALLENGE_PROMPT_ALREADY_SET");
    }
    if (!isValidPermutationIndex(input.permutationIndex)) {
      throw new Error("INVALID_PERMUTATION_INDEX");
    }
    for (const doc of teamsSnap.docs) {
      if (doc.id === input.teamId) {
        continue;
      }
      const taken = doc.data()?.promptPermutationIndex;
      if (typeof taken === "number" && taken === input.permutationIndex) {
        throw new Error("PERMUTATION_TAKEN");
      }
    }
    const prompt = composeRegistrationPrompt(input.permutationIndex);
    transaction.update(teamRef, {
      challengePrompt: prompt,
      promptPermutationIndex: input.permutationIndex,
      promptSpinsUsed: 1,
      challengePromptAt: FieldValue.serverTimestamp()
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

export async function deleteTeam(teamId: string): Promise<void> {
  const db = getDb();
  const raceRef = db.collection(COL_CONFIG).doc(DOC_RACE);

  await db.runTransaction(async (transaction) => {
    const teamRef = db.collection(COL_TEAMS).doc(teamId);
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const raceSnap = await transaction.get(raceRef);
    if (raceSnap.exists && raceSnap.data()?.teamId === teamId) {
      transaction.set(
        raceRef,
        {
          ...defaultRaceFields(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
    transaction.delete(teamRef);
  });
}

export async function updateTeamProgress(input: {
  teamId: string;
  delta: number;
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
    const nextProgress = Math.max(0, Math.min(MAX_PROGRESS, progress + Number(input.delta)));
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
  const ref = db.collection(COL_CONFIG).doc(DOC_TIMER);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const raw = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const core = timerDataToCore(raw);
    const baseDurationSec =
      Number.isFinite(core.baseDurationSec) && core.baseDurationSec > 0
        ? core.baseDurationSec
        : DEFAULT_BASE_DURATION_SEC;
    const extendedSec = Number.isFinite(core.extendedSec) ? Math.max(0, core.extendedSec) : 0;
    transaction.set(
      ref,
      {
        status: "running",
        startedAt: FieldValue.serverTimestamp(),
        baseDurationSec,
        extendedSec,
        startCeremonyPending: false,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

export async function resetTimer(): Promise<void> {
  const db = getDb();
  await db.collection(COL_CONFIG).doc(DOC_TIMER).set(
    {
      ...defaultTimerFields(),
      startCeremonyPending: true,
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

function emptyVolunteerAwardsRecord(): Record<VolunteerAwardKey, VolunteerAwardSelection> {
  return Object.fromEntries(VOLUNTEER_AWARDS.map((a) => [a.key, null])) as Record<
    VolunteerAwardKey,
    VolunteerAwardSelection
  >;
}

export async function getVolunteerRewards(): Promise<VolunteerRewardsState> {
  const db = getDb();
  const snap = await db.collection(COL_CONFIG).doc(DOC_VOLUNTEER_REWARDS).get();
  const awards = emptyVolunteerAwardsRecord();

  if (!snap.exists) {
    return { awards, updatedAt: null };
  }

  const data = snap.data()!;
  const raw = data.awards as Record<string, unknown> | undefined;

  for (const a of VOLUNTEER_AWARDS) {
    const entry = raw?.[a.key];
    if (entry && typeof entry === "object" && entry !== null) {
      const o = entry as { teamId?: unknown; teamName?: unknown };
      const tid = typeof o.teamId === "string" ? o.teamId.trim() : "";
      if (tid) {
        awards[a.key] = {
          teamId: tid,
          teamName: typeof o.teamName === "string" ? o.teamName : ""
        };
      }
    }
  }

  const ua = data.updatedAt;
  return {
    awards,
    updatedAt: ua instanceof Timestamp ? ua.toDate().toISOString() : null
  };
}

export async function setVolunteerRewards(payload: VolunteerRewardsPayload): Promise<void> {
  const db = getDb();
  const ref = db.collection(COL_CONFIG).doc(DOC_VOLUNTEER_REWARDS);

  await db.runTransaction(async (transaction) => {
    const teamsSnap = await transaction.get(db.collection(COL_TEAMS).orderBy("createdAt", "asc"));
    const nameById = new Map<string, string>();
    for (const d of teamsSnap.docs) {
      nameById.set(d.id, String(d.data().name ?? ""));
    }

    const awards: Record<string, { teamId: string; teamName: string } | null> = {};
    for (const a of VOLUNTEER_AWARDS) {
      const id = payload[a.key];
      if (id === null) {
        awards[a.key] = null;
      } else if (!nameById.has(id)) {
        throw new Error("TEAM_NOT_FOUND");
      } else {
        awards[a.key] = { teamId: id, teamName: nameById.get(id)! };
      }
    }

    transaction.set(
      ref,
      {
        awards,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

export async function updateTeamMissionStatement(input: {
  teamId: string;
  statement: string;
}): Promise<void> {
  const db = getDb();
  const teamRef = db.collection(COL_TEAMS).doc(input.teamId);
  const snap = await teamRef.get();
  if (!snap.exists) {
    throw new Error("TEAM_NOT_FOUND");
  }

  await teamRef.update({
    missionStatement: input.statement,
    missionStatementFileUrl: FieldValue.delete(),
    missionStatementFileName: FieldValue.delete()
  });
}
