import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { timerExtendSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";

export async function POST(request: NextRequest) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorized();
  }

  const payload = await request.json().catch(() => null);
  const parsed = timerExtendSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("minutes must be 5 or 10");
  }

  try {
    const timer = await prisma.eventTimer.findUnique({ where: { id: 1 } });
    if (!timer || timer.status !== "running") {
      return badRequest("Timer is not running");
    }

    await prisma.eventTimer.update({
      where: { id: 1 },
      data: {
        extendedSec: {
          increment: parsed.data.minutes * 60
        }
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to extend timer", error);
    return serverError("Failed to extend timer");
  }
}
