import { NextResponse, type NextRequest } from "next/server";
import { deleteTeam } from "@/lib/firestore/store";
import { badRequest, serverError } from "@/lib/http";
import { deleteTeamSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";

export async function DELETE(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = deleteTeamSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("teamId is required");
  }

  try {
    await deleteTeam(parsed.data.teamId);
    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_NOT_FOUND") {
      return badRequest("Team not found");
    }
    console.error("Failed to delete team", error);
    return serverError("Failed to delete team");
  }
}
