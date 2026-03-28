import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { DEFAULT_BASE_DURATION_SEC } from "@/lib/constants";
import { serverError, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getEventState } from "@/lib/state";

export async function POST(request: NextRequest) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorized();
  }

  try {
    await prisma.eventTimer.upsert({
      where: { id: 1 },
      update: {
        status: "idle",
        startedAt: null,
        baseDurationSec: DEFAULT_BASE_DURATION_SEC,
        extendedSec: 0
      },
      create: {
        id: 1,
        status: "idle",
        startedAt: null,
        baseDurationSec: DEFAULT_BASE_DURATION_SEC,
        extendedSec: 0
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to reset timer", error);
    return serverError("Failed to reset timer");
  }
}
