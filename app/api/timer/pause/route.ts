import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getEventState } from "@/lib/state";
import { getRemainingSeconds } from "@/lib/timer";

export async function POST() {
  try {
    const current = await prisma.eventTimer.findUnique({ where: { id: 1 } });
    if (!current) {
      const state = await getEventState();
      return NextResponse.json({ ok: true, state });
    }

    const remaining = current.status === "running" ? getRemainingSeconds(current) : current.baseDurationSec + current.extendedSec;

    await prisma.eventTimer.update({
      where: { id: 1 },
      data: {
        status: "idle",
        startedAt: null,
        baseDurationSec: Math.max(0, remaining),
        extendedSec: 0
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to pause timer", error);
    return serverError("Failed to pause timer");
  }
}
