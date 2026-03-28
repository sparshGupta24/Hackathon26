import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getEventState } from "@/lib/state";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { minutes?: number };
    const minutes = payload.minutes;
    if (minutes !== 5 && minutes !== 10) {
      return NextResponse.json({ error: "minutes must be 5 or 10" }, { status: 400 });
    }

    await prisma.eventTimer.upsert({
      where: { id: 1 },
      update: {
        baseDurationSec: {
          increment: minutes * 60
        }
      },
      create: {
        id: 1,
        status: "idle",
        startedAt: null,
        baseDurationSec: minutes * 60,
        extendedSec: 0
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to extend timer", error);
    return serverError("Failed to extend timer");
  }
}
