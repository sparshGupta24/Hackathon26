import { NextResponse } from "next/server";
import { getPeopleAwardConfirmations } from "@/lib/firestore/peopleAwardConfirmations";
import { getVoteTallies } from "@/lib/firestore/votes";
import { getEventState } from "@/lib/state";
import { VOTE_CATEGORIES, type VoteCategoryId } from "@/lib/voteCategories";
import { resolvePeopleAwardForCeremony } from "@/lib/peopleAwardsResolve";
import { topVoteRecipients } from "@/lib/voteTally";
import type { TeamState } from "@/lib/types";
import { serverError } from "@/lib/http";

function enrichLeader(
  entry: { playerId: string; teamId: string; count: number },
  teams: TeamState[]
) {
  const team = teams.find((t) => t.id === entry.teamId) ?? null;
  const player = team?.players.find((p) => p.id === entry.playerId) ?? null;
  return {
    playerId: entry.playerId,
    teamId: entry.teamId,
    count: entry.count,
    name: player?.name ?? "Unknown player",
    teamName: team?.name ?? "Unknown team",
    photoUrl: player?.photoUrl
  };
}

export async function GET() {
  try {
    const [state, tallies, confirmations] = await Promise.all([
      getEventState(),
      getVoteTallies(),
      getPeopleAwardConfirmations()
    ]);
    const teams = state.teams;

    const categories = VOTE_CATEGORIES.map((c) => {
      const list = tallies.byCategory[c.id] ?? [];
      const leadersRaw = topVoteRecipients(list);
      const conf = confirmations[c.id];
      const { winner, awardPendingTieBreak } = resolvePeopleAwardForCeremony(teams, list, conf);
      const leadersEnriched = leadersRaw.map((e) => enrichLeader(e, teams));
      const isTie = leadersRaw.length > 1;
      const needsPick = isTie && !conf;

      let selectedKey: string | null = null;
      if (conf) {
        selectedKey = `${conf.playerId}__${conf.teamId}`;
      } else if (!isTie && leadersRaw.length === 1) {
        selectedKey = `${leadersRaw[0]!.playerId}__${leadersRaw[0]!.teamId}`;
      }

      return {
        key: c.id as VoteCategoryId,
        title: c.label,
        description: c.description,
        leaders: leadersEnriched,
        isTie,
        needsPick,
        confirmed: conf ?? null,
        ceremonyWinner: winner,
        awardPendingTieBreak,
        selectedKey
      };
    });

    return NextResponse.json({ categories, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to load admin people awards", error);
    return serverError("Failed to load people award admin", error);
  }
}
