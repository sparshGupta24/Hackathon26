import { NextResponse } from "next/server";
import { getEventState } from "@/lib/state";
import { getVoteTallies, submitVotePair, validateVoteTeamMember } from "@/lib/firestore/votes";
import { badRequest, serverError } from "@/lib/http";

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
      gunner?: { playerId?: string; teamId?: string };
      ripper?: { playerId?: string; teamId?: string };
    };

    const voterId = typeof body.voterId === "string" ? body.voterId.trim() : "";
    if (!voterId || voterId.length < 8) {
      return badRequest("Invalid voter id.");
    }

    const g = body.gunner;
    const r = body.ripper;
    if (!g?.playerId || !g?.teamId || !r?.playerId || !r?.teamId) {
      return badRequest("Select one person for Best gunner and one for Best ripper.");
    }

    const state = await getEventState();
    const teams = state.teams;

    if (!validateVoteTeamMember(teams, g.playerId, g.teamId)) {
      return badRequest("Invalid Best gunner selection.");
    }
    if (!validateVoteTeamMember(teams, r.playerId, r.teamId)) {
      return badRequest("Invalid Best ripper selection.");
    }

    await submitVotePair({
      voterId,
      gunner: { playerId: g.playerId, teamId: g.teamId },
      ripper: { playerId: r.playerId, teamId: r.teamId }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_VOTED") {
      return badRequest("You have already cast votes from this device.");
    }
    console.error("Failed to submit votes", error);
    return serverError();
  }
}
