import { NextResponse } from "next/server";
import { getEventState } from "@/lib/state";
import { serverError } from "@/lib/http";

export async function GET() {
  try {
    const state = await getEventState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to fetch event state", error);
    return serverError();
  }
}
