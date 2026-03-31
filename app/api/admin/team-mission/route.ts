import { NextResponse, type NextRequest } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { missionStatementUpdateSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";
import { updateTeamMissionStatement } from "@/lib/firestore/store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = missionStatementUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "teamId and statement are required");
  }

  try {
    await updateTeamMissionStatement({
      teamId: parsed.data.teamId,
      statement: parsed.data.statement
    });
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_NOT_FOUND") {
      return badRequest("Team not found");
    }
    console.error("Failed to update team mission", error);
    return serverError("Failed to save mission statement");
  }
}
