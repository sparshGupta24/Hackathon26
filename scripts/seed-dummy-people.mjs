/**
 * Adds dummy roster entries to Firestore `people` for local / QA testing.
 * Uses a tiny inline PNG (data URL) so Firebase Storage is not required.
 *
 * Usage:
 *   npm run seed:dummy-players
 *
 * Options:
 *   --fresh   Delete every document in `people`, then insert dummies (destructive).
 *
 * By default, skips a name if a person with that display name already exists.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const COL_PEOPLE = "people";

/** 1×1 PNG — valid image, minimal size */
const PLACEHOLDER_PHOTO_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const DUMMY_PLAYERS = [
  "Alex Rivera",
  "Jordan Chen",
  "Sam Okonkwo",
  "Taylor Kim",
  "Riley Patel",
  "Morgan Blake",
  "Casey Nguyen",
  "Drew Martinez"
];

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

async function deleteAllPeople(db) {
  const snap = await db.collection(COL_PEOPLE).get();
  if (snap.empty) {
    return 0;
  }
  let batch = db.batch();
  let inBatch = 0;
  let n = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    inBatch++;
    n++;
    if (inBatch >= 500) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) {
    await batch.commit();
  }
  return n;
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  initAdmin();
  const db = getFirestore();

  if (fresh) {
    const removed = await deleteAllPeople(db);
    console.log(`Removed ${removed} existing roster document(s) (--fresh).`);
  }

  let added = 0;
  let skipped = 0;

  for (const name of DUMMY_PLAYERS) {
    if (!fresh) {
      const dup = await db.collection(COL_PEOPLE).where("name", "==", name).limit(1).get();
      if (!dup.empty) {
        console.log(`Skip (already exists): ${name}`);
        skipped++;
        continue;
      }
    }

    await db.collection(COL_PEOPLE).doc().set({
      name,
      photoUrl: PLACEHOLDER_PHOTO_URL,
      storagePath: null,
      storageBucket: null,
      createdAt: FieldValue.serverTimestamp()
    });
    console.log(`Added: ${name}`);
    added++;
  }

  console.log(`Done. Added ${added}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
