/**
 * Deletes every document in the Firestore `teams` collection.
 *
 * Usage (from project root, with same env as Next.js):
 *   npm run delete:teams
 *
 * Or:
 *   node --env-file=.env scripts/delete-all-teams.mjs
 *
 * Requires Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT_JSON,
 * GOOGLE_APPLICATION_CREDENTIALS, or Firestore emulator).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function normalizeServiceAccount(parsed) {
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

function initAdmin() {
  if (getApps().length > 0) {
    return;
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-hack"
    });
    return;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const parsed = normalizeServiceAccount(JSON.parse(json));
    initializeApp({ credential: cert(parsed) });
    return;
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    const absolute = resolve(credPath);
    if (!existsSync(absolute)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${absolute}`);
    }
    let raw = readFileSync(absolute, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    const parsed = normalizeServiceAccount(JSON.parse(raw));
    initializeApp({ credential: cert(parsed) });
    return;
  }
  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, or FIRESTORE_EMULATOR_HOST."
  );
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const snap = await db.collection("teams").get();

  if (snap.empty) {
    console.log("No teams in Firestore — nothing to delete.");
    return;
  }

  let batch = db.batch();
  let inBatch = 0;
  let total = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    inBatch++;
    total++;
    if (inBatch >= 500) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) {
    await batch.commit();
  }

  console.log(`Deleted ${total} team document(s) from collection "teams".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
