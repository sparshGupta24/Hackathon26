import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getEventState } from "@/lib/state";

export async function POST() {
  try {
    const current = await prisma.eventTimer.findUnique({ where: { id: 1 } });
    if (!current) {
      const state = await getEventState();
      return NextResponse.json({ ok: true, state });
    }

    if (current.status === "running") {
      const state = await getEventState();
      return NextResponse.json({ ok: true, state });
    }

    await prisma.eventTimer.update({
      where: { id: 1 },
      data: {
        status: "running",
        startedAt: new Date()
      }
    });

    const state = await getEventState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error("Failed to resume timer", error);
    return serverError("Failed to resume timer");
  }
}
