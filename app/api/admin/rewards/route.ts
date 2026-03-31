import { NextResponse, type NextRequest } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { volunteerRewardsPayloadSchema } from "@/lib/volunteerRewards";
import { getVolunteerRewards, setVolunteerRewards } from "@/lib/firestore/store";

export async function GET() {
  try {
    const rewards = await getVolunteerRewards();
    return NextResponse.json(rewards);
  } catch (error) {
    console.error("Failed to load volunteer rewards", error);
    return serverError("Failed to load volunteer rewards", error);
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = volunteerRewardsPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("Invalid rewards payload");
  }

  try {
    await setVolunteerRewards(parsed.data);
    const rewards = await getVolunteerRewards();
    return NextResponse.json({ ok: true, rewards });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_NOT_FOUND") {
      return badRequest("One or more selected teams are not registered");
    }
    console.error("Failed to save volunteer rewards", error);
    return serverError("Failed to save volunteer rewards", error);
  }
}
