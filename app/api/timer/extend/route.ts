import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { getEventState } from "@/lib/state";
import { publicExtendTimerBase } from "@/lib/firestore/store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { minutes?: number };
    const minutes = payload.minutes;
    if (minutes !== 5 && minutes !== 10) {
      return NextResponse.json({ error: "minutes must be 5 or 10" }, { status: 400 });
    }

    await publicExtendTimerBase(minutes);
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to extend timer", error);
    return serverError("Failed to extend timer");
  }
}
