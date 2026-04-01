import { NextResponse } from "next/server";
import { getPeopleAwardConfirmations } from "@/lib/firestore/peopleAwardConfirmations";
import { getVoteTallies } from "@/lib/firestore/votes";
import { getEventState } from "@/lib/state";
import { VOTE_CATEGORIES } from "@/lib/voteCategories";
import type { PeopleAwardPresentationItem } from "@/lib/types";
import { resolvePeopleAwardForCeremony } from "@/lib/peopleAwardsResolve";
import { serverError } from "@/lib/http";

export async function GET() {
  try {
    const [state, tallies, confirmations] = await Promise.all([
      getEventState(),
      getVoteTallies(),
      getPeopleAwardConfirmations()
    ]);
    const teams = state.teams;

    const items: PeopleAwardPresentationItem[] = VOTE_CATEGORIES.map((c) => {
      const list = tallies.byCategory[c.id] ?? [];
      const conf = confirmations[c.id];
      const { winner, team, awardPendingTieBreak } = resolvePeopleAwardForCeremony(teams, list, conf);
      return {
        key: c.id,
        title: c.label,
        description: c.description,
        winner,
        team,
        ...(awardPendingTieBreak ? { awardPendingTieBreak: true } : {})
      };
    });

    return NextResponse.json({ items, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to load people awards presentation", error);
    return serverError("Failed to load people awards", error);
  }
}
