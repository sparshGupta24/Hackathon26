import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { getEventState } from "@/lib/state";
import { resumeTimer } from "@/lib/firestore/store";

export async function POST() {
  try {
    await resumeTimer();
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to resume timer", error);
    return serverError("Failed to resume timer");
  }
}
