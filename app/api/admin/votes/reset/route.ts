import { NextResponse } from "next/server";
import { clearPeopleAwardConfirmations } from "@/lib/firestore/peopleAwardConfirmations";
import { clearAllAudienceVotes } from "@/lib/firestore/votes";
import { serverError } from "@/lib/http";

/**
 * Deletes all audience vote documents so tallies and device ballot locks start fresh.
 * Also clears stored people-award confirmations (ties / manual picks).
 * Organizer-only by URL convention; add auth if this is exposed publicly.
 */
export async function POST() {
  try {
    const deleted = await clearAllAudienceVotes();
    await clearPeopleAwardConfirmations();
    return NextResponse.json({ ok: true, deletedCount: deleted });
  } catch (error) {
    console.error("Failed to reset votes", error);
    return serverError("Failed to reset votes");
  }
}
