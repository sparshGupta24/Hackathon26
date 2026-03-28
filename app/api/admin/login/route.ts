import { NextResponse } from "next/server";
import { createSessionToken, isValidPasscode, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { badRequest, unauthorized } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return badRequest("Passcode is required");
  }

  if (!isValidPasscode(parsed.data.passcode)) {
    return unauthorized("Invalid passcode");
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), sessionCookieOptions);
  return response;
}
