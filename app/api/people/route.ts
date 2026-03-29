import { NextResponse } from "next/server";
import { listPeople } from "@/lib/firestore/people";
import { serverError } from "@/lib/http";

export async function GET() {
  try {
    const people = await listPeople();
    return NextResponse.json(people);
  } catch (error) {
    console.error("Failed to list people", error);
    return serverError("Failed to load players");
  }
}
