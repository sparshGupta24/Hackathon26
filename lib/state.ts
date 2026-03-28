import type { EventTimer, Prisma } from "@prisma/client";
import { DEFAULT_BASE_DURATION_SEC } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getRemainingSeconds, shouldAutoEnd, totalDurationSec } from "@/lib/timer";
import type { EventStateResponse, TimerState } from "@/lib/types";

async function ensureTimer(tx: Prisma.TransactionClient | typeof prisma): Promise<EventTimer> {
  const timer = await tx.eventTimer.findUnique({ where: { id: 1 } });
  if (timer) {
    return timer;
  }

  return tx.eventTimer.create({
    data: {
      id: 1,
      status: "idle",
      baseDurationSec: DEFAULT_BASE_DURATION_SEC,
      extendedSec: 0,
      startedAt: null
    }
  });
}

async function ensureRaceUpdate(tx: Prisma.TransactionClient | typeof prisma) {
  const update = await tx.raceUpdate.findUnique({ where: { id: 1 } });
  if (update) {
    return update;
  }
  return tx.raceUpdate.create({
    data: {
      id: 1,
      teamId: null,
      teamName: "Race Control",
      message: "Race control online",
      delta: 0,
      accentColor: "#FFFFFF"
    }
  });
}

function toTimerState(timer: EventTimer): TimerState {
  const remainingSec = getRemainingSeconds(timer);
  return {
    status: timer.status,
    startedAt: timer.startedAt?.toISOString() ?? null,
    baseDurationSec: timer.baseDurationSec,
    extendedSec: timer.extendedSec,
    updatedAt: timer.updatedAt.toISOString(),
    totalDurationSec: totalDurationSec(timer),
    remainingSec
  };
}

export async function getEventState(): Promise<EventStateResponse> {
  return prisma.$transaction(async (tx) => {
    let timer = await ensureTimer(tx);
    const raceUpdate = await ensureRaceUpdate(tx);

    if (shouldAutoEnd(timer)) {
      timer = await tx.eventTimer.update({
        where: { id: 1 },
        data: {
          status: "ended"
        }
      });
    }

    const teams = await tx.team.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        players: {
          orderBy: { slot: "asc" }
        },
        livery: true
      }
    });

    return {
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        progress: team.progress,
        createdAt: team.createdAt.toISOString(),
        players: team.players.map((player) => ({
          id: player.id,
          name: player.name,
          slot: player.slot
        })),
        livery: team.livery
          ? {
              preset: team.livery.preset,
              primaryColor: team.livery.primaryColor,
              secondaryColor: team.livery.secondaryColor,
              tertiaryColor: team.livery.tertiaryColor,
              carNumber: team.livery.carNumber
            }
          : null
      })),
      timer: toTimerState(timer),
      raceUpdate: {
        teamId: raceUpdate.teamId,
        teamName: raceUpdate.teamName,
        message: raceUpdate.message,
        delta: raceUpdate.delta,
        accentColor: raceUpdate.accentColor,
        updatedAt: raceUpdate.updatedAt.toISOString()
      },
      serverTime: new Date().toISOString()
    };
  });
}

export async function getOrCreateTimer(): Promise<EventTimer> {
  return prisma.$transaction((tx) => ensureTimer(tx));
}
