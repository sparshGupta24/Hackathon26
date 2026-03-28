import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "@/lib/constants";

interface SessionPayload {
  exp: number;
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-admin-session-secret";
}

function getVolunteerPasscode(): string {
  return process.env.VOLUNTEER_PASSCODE || "pitcrew";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  if (first.length !== second.length) {
    return false;
  }
  return crypto.timingSafeEqual(first, second);
}

export function isValidPasscode(passcode: string): boolean {
  return safeEqual(passcode, getVolunteerPasscode());
}

export function createSessionToken(nowMs = Date.now()): string {
  const payload: SessionPayload = {
    exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SEC
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(serialized);
  return `${serialized}.${signature}`;
}

export function verifySessionToken(token: string | undefined, nowMs = Date.now()): boolean {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload);
  if (!safeEqual(signature, expected)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    return decoded.exp > Math.floor(nowMs / 1000);
  } catch {
    return false;
  }
}

export function isAuthenticatedRequest(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_MAX_AGE_SEC,
  path: "/"
};
