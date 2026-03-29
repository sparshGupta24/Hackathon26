import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { registrationSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";
import { registerTeam } from "@/lib/firestore/store";

function normalizeRegistrationPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const input = payload as {
    teamName?: unknown;
    playerIds?: unknown;
    livery?: unknown;
  };

  return {
    ...input,
    teamName: typeof input.teamName === "string" ? input.teamName.trim() : input.teamName,
    playerIds: Array.isArray(input.playerIds)
      ? input.playerIds.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean)
      : input.playerIds
  };
}

export async function POST(request: Request) {
  try {
    const payload = normalizeRegistrationPayload(await request.json());
    const parsed = registrationSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid registration payload");
    }

    await registerTeam({
      teamName: parsed.data.teamName,
      playerIds: parsed.data.playerIds,
      livery: parsed.data.livery
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_LIMIT_REACHED") {
      return badRequest("Registration is closed. Six teams have already registered.");
    }
    if (error instanceof Error && error.message.startsWith("PERSON_NOT_FOUND")) {
      return badRequest("One or more selected players are no longer available. Refresh and pick again.");
    }

    console.error("Failed to register team", error);
    return serverError("Failed to register team");
  }
}
