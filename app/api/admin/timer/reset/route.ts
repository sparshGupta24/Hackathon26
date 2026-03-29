import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { getEventState } from "@/lib/state";
import { resetTimer } from "@/lib/firestore/store";

export async function POST() {
  try {
    await resetTimer();
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to reset timer", error);
    return serverError("Failed to reset timer");
  }
}
