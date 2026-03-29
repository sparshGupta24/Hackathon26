import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { getEventState } from "@/lib/state";
import { pauseTimer } from "@/lib/firestore/store";

export async function POST() {
  try {
    await pauseTimer();
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to pause timer", error);
    return serverError("Failed to pause timer");
  }
}
