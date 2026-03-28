import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { teamProgressSchema } from "@/lib/schemas";
import { getEventState } from "@/lib/state";

const MAX_PROGRESS = 100;

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

function brightness(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function brightestColor(colors: string[]) {
  return colors.reduce((best, next) => (brightness(next) > brightness(best) ? next : best));
}

export async function POST(request: NextRequest) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorized();
  }

  const payload = await request.json().catch(() => null);
  const parsed = teamProgressSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("teamId, delta (+1/-1), and message are required");
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: parsed.data.teamId },
      select: {
        id: true,
        name: true,
        progress: true,
        livery: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            tertiaryColor: true
          }
        }
      }
    });

    if (!team) {
      return badRequest("Team not found");
    }

    const nextProgress = Math.max(0, Math.min(MAX_PROGRESS, team.progress + parsed.data.delta));
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: { progress: nextProgress },
      select: { id: true, name: true, progress: true }
    });

    const message = parsed.data.message;
    const accentColor = team.livery
      ? brightestColor([team.livery.primaryColor, team.livery.secondaryColor, team.livery.tertiaryColor])
      : "#FFFFFF";
    await prisma.raceUpdate.upsert({
      where: { id: 1 },
      update: {
        teamId: updatedTeam.id,
        teamName: updatedTeam.name,
        message,
        delta: parsed.data.delta,
        accentColor
      },
      create: {
        id: 1,
        teamId: updatedTeam.id,
        teamName: updatedTeam.name,
        message,
        delta: parsed.data.delta,
        accentColor
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to update team progress", error);
    return serverError("Failed to update team progress");
  }
}
