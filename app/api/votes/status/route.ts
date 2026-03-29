import { NextResponse } from "next/server";
import { hasVoterSubmitted } from "@/lib/firestore/votes";
import { badRequest, serverError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const voterId = new URL(request.url).searchParams.get("voterId")?.trim() ?? "";
    if (!voterId || voterId.length < 8) {
      return badRequest("Missing voter id.");
    }
    const hasVoted = await hasVoterSubmitted(voterId);
    return NextResponse.json({ hasVoted });
  } catch (error) {
    console.error("Failed to read vote status", error);
    return serverError();
  }
}
