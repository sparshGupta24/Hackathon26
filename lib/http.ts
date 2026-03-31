import { NextResponse } from "next/server";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function serverError(message = "Something went wrong", cause?: unknown) {
  if (cause instanceof Error) {
    console.error(message, cause);
  } else if (cause !== undefined) {
    console.error(message, cause);
  }

  const isDev = process.env.NODE_ENV === "development";
  if (isDev && cause instanceof Error) {
    return NextResponse.json({ error: message, detail: cause.message }, { status: 500 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
