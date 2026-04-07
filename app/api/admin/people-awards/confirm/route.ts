import { NextResponse } from "next/server";
import { setPeopleAwardConfirmation } from "@/lib/firestore/peopleAwardConfirmations";
import { getEventState } from "@/lib/state";
import { badRequest, serverError } from "@/lib/http";
import { confirmPeopleAwardSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = confirmPeopleAwardSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const { categoryId, playerId, teamId } = parsed.data;
    const state = await getEventState();
    const team = state.teams.find((t) => t.id === teamId);
    const ok = Boolean(team && team.players.some((p) => p.id === playerId));
    if (!ok) {
      return badRequest("Chosen player must belong to the selected team.");
    }

    await setPeopleAwardConfirmation({ categoryId, playerId, teamId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to confirm people award", error);
    return serverError("Failed to confirm award");
  }
}
