import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { timerExtendSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";
import { extendTimerWhileRunning } from "@/lib/firestore/store";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = timerExtendSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("minutes must be 5 or 10");
  }

  try {
    const ok = await extendTimerWhileRunning(parsed.data.minutes);
    if (!ok) {
      return badRequest("Timer is not running");
    }
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to extend timer", error);
    return serverError("Failed to extend timer");
  }
}
