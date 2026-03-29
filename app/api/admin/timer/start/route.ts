import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { getEventState } from "@/lib/state";
import { startTimerRunning } from "@/lib/firestore/store";

export async function POST() {
  try {
    await startTimerRunning();
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to start timer", error);
    return serverError("Failed to start timer");
  }
}
