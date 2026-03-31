import { NextResponse, type NextRequest } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { teamProgressSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";
import { updateTeamProgress } from "@/lib/firestore/store";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = teamProgressSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("teamId, delta (−10, 0, +10, or +20), and message are required");
  }

  try {
    await updateTeamProgress({
      teamId: parsed.data.teamId,
      delta: parsed.data.delta,
      message: parsed.data.message
    });
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_NOT_FOUND") {
      return badRequest("Team not found");
    }
    console.error("Failed to update team progress", error);
    return serverError("Failed to update team progress");
  }
}
