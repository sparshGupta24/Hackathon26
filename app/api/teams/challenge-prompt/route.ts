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
      prompt: parsed.data.prompt,
      spinsUsed: parsed.data.spinsUsed
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

    console.error("Failed to set challenge prompt", error);
    return serverError("Failed to save challenge prompt");
  }
}
