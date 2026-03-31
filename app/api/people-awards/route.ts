import { NextResponse } from "next/server";
import { getVoteTallies } from "@/lib/firestore/votes";
import { getEventState } from "@/lib/state";
import { VOTE_CATEGORIES, type VoteCategoryId } from "@/lib/voteCategories";
import type { PeopleAwardPresentationItem, PeopleAwardWinnerPresentation, TeamState } from "@/lib/types";
import { topVoteRecipients } from "@/lib/voteTally";
import { serverError } from "@/lib/http";

function resolveCategoryWinner(
  catId: VoteCategoryId,
  teams: TeamState[],
  entries: { playerId: string; teamId: string; count: number }[]
): { winner: PeopleAwardWinnerPresentation | null; team: TeamState | null } {
  const tops = topVoteRecipients(entries);
  if (!tops.length) {
    return { winner: null, team: null };
  }
  const pick = [...tops].sort((a, b) => a.playerId.localeCompare(b.playerId))[0]!;
  const team = teams.find((t) => t.id === pick.teamId) ?? null;
  const player = team?.players.find((p) => p.id === pick.playerId) ?? null;
  if (!player) {
    return {
      winner: {
        playerId: pick.playerId,
        teamId: pick.teamId,
        name: "Unknown player",
        teamName: team?.name ?? "Unknown team"
      },
      team
    };
  }
  return {
    winner: {
      playerId: player.id,
      teamId: pick.teamId,
      name: player.name,
      photoUrl: player.photoUrl,
      teamName: team?.name ?? "Team"
    },
    team
  };
}

export async function GET() {
  try {
    const [state, tallies] = await Promise.all([getEventState(), getVoteTallies()]);
    const teams = state.teams;

    const items: PeopleAwardPresentationItem[] = VOTE_CATEGORIES.map((c) => {
      const list = tallies.byCategory[c.id] ?? [];
      const { winner, team } = resolveCategoryWinner(c.id, teams, list);
      return {
        key: c.id,
        title: c.label,
        description: c.description,
        winner,
        team
      };
    });

    return NextResponse.json({ items, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to load people awards presentation", error);
    return serverError("Failed to load people awards", error);
  }
}
