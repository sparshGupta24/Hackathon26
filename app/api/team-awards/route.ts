import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { getEventState, getVolunteerRewards } from "@/lib/firestore/store";
import { VOLUNTEER_AWARDS } from "@/lib/volunteerRewards";
import type { TeamAwardPresentationItem } from "@/lib/types";

export async function GET() {
  try {
    const [rewards, state] = await Promise.all([getVolunteerRewards(), getEventState()]);
    const teamById = new Map(state.teams.map((t) => [t.id, t]));

    const items: TeamAwardPresentationItem[] = VOLUNTEER_AWARDS.map((a) => {
      const sel = rewards.awards[a.key];
      const team = sel ? (teamById.get(sel.teamId) ?? null) : null;
      return {
        key: a.key,
        title: a.title,
        description: a.description,
        team
      };
    });

    return NextResponse.json({
      items,
      updatedAt: rewards.updatedAt
    });
  } catch (error) {
    console.error("Failed to load team awards presentation", error);
    return serverError("Failed to load team awards", error);
  }
}
