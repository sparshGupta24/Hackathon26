import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AppOptions } from "firebase-admin/app";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * PEM in service account JSON must use real newlines. Copy-paste / editors sometimes
 * leave literal backslash-n or break headers (OpenSSL then throws DECODER routines::unsupported).
 */
function normalizeServiceAccount(parsed: Record<string, unknown>): Record<string, unknown> {
  const pk = parsed.private_key;
  if (typeof pk !== "string") {
    return parsed;
  }
  let fixed = pk.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  fixed = fixed.replace(/^-----BEGIN PRIVATE KEY----\s*$/m, "-----BEGIN PRIVATE KEY-----");
  fixed = fixed.replace(/^-----END PRIVATE KEY----\s*$/m, "-----END PRIVATE KEY-----");
  if (!fixed.endsWith("\n")) {
    fixed += "\n";
  }
  return { ...parsed, private_key: fixed };
}

function readServiceAccountFromFile(pathFromEnv: string): Record<string, unknown> {
  const absolute = resolve(pathFromEnv);
  if (!existsSync(absolute)) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${absolute}`);
  }
  let raw = readFileSync(absolute, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  return normalizeServiceAccount(JSON.parse(raw) as Record<string, unknown>);
}

function buildAppOptions(): AppOptions {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-hack"
    };
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const parsed = normalizeServiceAccount(JSON.parse(json) as Record<string, unknown>);
    const projectId = typeof parsed.project_id === "string" ? parsed.project_id : undefined;
    // New Firebase projects default to *.firebasestorage.app; older ones use *.appspot.com.
    // Override with FIREBASE_STORAGE_BUCKET if uploads fail (see Firebase console → Storage).
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      (projectId ? `${projectId}.firebasestorage.app` : undefined);
    return {
      credential: cert(parsed as never),
      ...(projectId ? { projectId } : {}),
      ...(storageBucket ? { storageBucket } : {})
    };
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    const parsed = readServiceAccountFromFile(credPath);
    const projectId = typeof parsed.project_id === "string" ? parsed.project_id : undefined;
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      (projectId ? `${projectId}.firebasestorage.app` : undefined);
    return {
      credential: cert(parsed as never),
      ...(projectId ? { projectId } : {}),
      ...(storageBucket ? { storageBucket } : {})
    };
  }

  throw new Error(
    "Firebase Admin not configured. For production set FIREBASE_SERVICE_ACCOUNT_JSON (full service account JSON string) " +
      "or GOOGLE_APPLICATION_CREDENTIALS. For the Firestore emulator set FIRESTORE_EMULATOR_HOST and FIREBASE_PROJECT_ID."
  );
}

function initAdmin(): void {
  if (getApps().length > 0) {
    return;
  }
  initializeApp(buildAppOptions());
}

export function getDb() {
  initAdmin();
  return getFirestore();
}

export function getBucket() {
  initAdmin();
  return getStorage().bucket();
}
