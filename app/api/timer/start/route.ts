import { NextResponse } from "next/server";
import { DEFAULT_BASE_DURATION_SEC } from "@/lib/constants";
import { serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getEventState } from "@/lib/state";

export async function POST() {
  try {
    await prisma.eventTimer.upsert({
      where: { id: 1 },
      update: {
        status: "running",
        startedAt: new Date(),
        baseDurationSec: DEFAULT_BASE_DURATION_SEC,
        extendedSec: 0
      },
      create: {
        id: 1,
        status: "running",
        startedAt: new Date(),
        baseDurationSec: DEFAULT_BASE_DURATION_SEC,
        extendedSec: 0
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to start public timer", error);
    return serverError("Failed to start timer");
  }
}
