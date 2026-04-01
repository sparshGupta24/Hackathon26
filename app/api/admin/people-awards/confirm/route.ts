import { NextResponse } from "next/server";
import { setPeopleAwardConfirmation } from "@/lib/firestore/peopleAwardConfirmations";
import { getVoteTallies } from "@/lib/firestore/votes";
import { badRequest, serverError } from "@/lib/http";
import { confirmPeopleAwardSchema } from "@/lib/schemas";
import { topVoteRecipients } from "@/lib/voteTally";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = confirmPeopleAwardSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const { categoryId, playerId, teamId } = parsed.data;
    const tallies = await getVoteTallies();
    const list = tallies.byCategory[categoryId] ?? [];
    const leaders = topVoteRecipients(list);
    if (!leaders.length) {
      return badRequest("No votes in this category yet.");
    }
    const ok = leaders.some((l) => l.playerId === playerId && l.teamId === teamId);
    if (!ok) {
      return badRequest("Chosen player must be among the top vote-getters for this category.");
    }

    await setPeopleAwardConfirmation({ categoryId, playerId, teamId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to confirm people award", error);
    return serverError("Failed to confirm award");
  }
}
