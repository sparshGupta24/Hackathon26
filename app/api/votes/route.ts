import { NextResponse } from "next/server";
import { getEventState } from "@/lib/state";
import { getVoteTallies, submitVoteBallot, validateVoteTeamMember } from "@/lib/firestore/votes";
import { VOTE_CATEGORIES, type VoteCategoryId } from "@/lib/voteCategories";
import { badRequest, serverError } from "@/lib/http";

function parseVotesBody(body: {
  voterId?: string;
  votes?: Record<string, { playerId?: string; teamId?: string } | undefined>;
}): { voterId: string; votes: Record<VoteCategoryId, { playerId: string; teamId: string }> } | null {
  const voterId = typeof body.voterId === "string" ? body.voterId.trim() : "";
  if (!voterId || voterId.length < 8) {
    return null;
  }
  const raw = body.votes;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const votes = {} as Record<VoteCategoryId, { playerId: string; teamId: string }>;
  for (const c of VOTE_CATEGORIES) {
    const slot = raw[c.id];
    const playerId = typeof slot?.playerId === "string" ? slot.playerId.trim() : "";
    const teamId = typeof slot?.teamId === "string" ? slot.teamId.trim() : "";
    if (!playerId || !teamId) {
      return null;
    }
    votes[c.id] = { playerId, teamId };
  }
  return { voterId, votes };
}

export async function GET() {
  try {
    const tallies = await getVoteTallies();
    return NextResponse.json({ tallies, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to read vote tallies", error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      voterId?: string;
      votes?: Record<string, { playerId?: string; teamId?: string } | undefined>;
    };

    const parsed = parseVotesBody(body);
    if (!parsed) {
      return badRequest(`Select one eligible player for each of the ${VOTE_CATEGORIES.length} categories.`);
    }

    const state = await getEventState();
    const teams = state.teams;

    for (const c of VOTE_CATEGORIES) {
      const v = parsed.votes[c.id]!;
      if (!validateVoteTeamMember(teams, v.playerId, v.teamId)) {
        return badRequest(`Invalid selection for “${c.label}”.`);
      }
    }

    await submitVoteBallot(parsed);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_VOTED") {
      return badRequest("You have already cast votes from this device.");
    }
    if (error instanceof Error && error.message === "INCOMPLETE_BALLOT") {
      return badRequest("Ballot is incomplete.");
    }
    console.error("Failed to submit votes", error);
    return serverError();
  }
}
