import { NextResponse } from "next/server";
import { TEAM_LIMIT } from "@/lib/constants";
import { badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { registrationSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";

function normalizeRegistrationPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const input = payload as {
    teamName?: unknown;
    players?: unknown;
    livery?: unknown;
  };

  return {
    ...input,
    teamName: typeof input.teamName === "string" ? input.teamName.trim() : input.teamName,
    players: Array.isArray(input.players)
      ? input.players.map((player) => (typeof player === "string" ? player.trim() : player)).filter(Boolean)
      : input.players
  };
}

export async function POST(request: Request) {
  try {
    const payload = normalizeRegistrationPayload(await request.json());
    const parsed = registrationSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid registration payload");
    }

    await prisma.$transaction(async (tx) => {
      const totalTeams = await tx.team.count();
      if (totalTeams >= TEAM_LIMIT) {
        throw new Error("TEAM_LIMIT_REACHED");
      }

      await tx.team.create({
        data: {
          name: parsed.data.teamName,
          players: {
            create: parsed.data.players.map((name, index) => ({
              name,
              slot: index + 1
            }))
          },
          livery: {
            create: {
              preset: parsed.data.livery.preset,
              primaryColor: parsed.data.livery.primaryColor,
              secondaryColor: parsed.data.livery.secondaryColor,
              tertiaryColor: parsed.data.livery.tertiaryColor,
              carNumber: parsed.data.livery.carNumber
            }
          }
        }
      });
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_LIMIT_REACHED") {
      return badRequest("Registration is closed. Six teams have already registered.");
    }

    console.error("Failed to register team", error);
    return serverError("Failed to register team");
  }
}
