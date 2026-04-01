import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { challengePromptSchema } from "@/lib/schemas";
import { setTeamChallengePrompt } from "@/lib/firestore/store";
import { getEventState } from "@/lib/state";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = challengePromptSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    await setTeamChallengePrompt({
      teamId: parsed.data.teamId,
      permutationIndex: parsed.data.permutationIndex
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_NOT_FOUND") {
      return badRequest("Team not found.");
    }
    if (error instanceof Error && error.message === "CHALLENGE_PROMPT_ALREADY_SET") {
      return badRequest("This team already has a challenge prompt.");
    }
    if (error instanceof Error && error.message === "PERMUTATION_TAKEN") {
      return badRequest("That prompt row was just claimed by another team. Pull the lever again.");
    }
    if (error instanceof Error && error.message === "INVALID_PERMUTATION_INDEX") {
      return badRequest("Invalid prompt row.");
    }

    console.error("Failed to set challenge prompt", error);
    return serverError("Failed to save challenge prompt");
  }
}
