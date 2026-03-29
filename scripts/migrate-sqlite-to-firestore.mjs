/**
 * One-time migration: Prisma SQLite (legacy schema) → Cloud Firestore layout used by the app.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-firestore.mjs /path/to/dev.db
 *
 * Requires the same Firebase Admin env as the Next app (see .env.example).
 * Overwrites `teams/{id}` and `config/raceUpdate`, `config/eventTimer` if they already exist.
 */

import { createRequire } from "node:module";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

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
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)) });
    return;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() });
    return;
  }
  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, or Firestore emulator env vars."
  );
}

function parseSqliteDate(value) {
  if (value == null || value === "") {
    return new Date();
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("Usage: node scripts/migrate-sqlite-to-firestore.mjs <path-to-sqlite.db>");
  process.exit(1);
}

initAdmin();
const firestore = getFirestore();
const sqlite = new Database(dbPath, { readonly: true });

const teams = sqlite.prepare("SELECT * FROM Team ORDER BY createdAt ASC").all();
const playersByTeam = sqlite.prepare("SELECT * FROM Player WHERE teamId = ? ORDER BY slot ASC");
const liveryForTeam = sqlite.prepare("SELECT * FROM Livery WHERE teamId = ?");

const batch = firestore.batch();

for (const t of teams) {
  const players = playersByTeam.all(t.id).map((p) => ({
    id: p.id,
    name: p.name,
    slot: p.slot
  }));
  const livery = liveryForTeam.get(t.id);
  const ref = firestore.collection("teams").doc(t.id);
  batch.set(ref, {
    name: t.name,
    progress: t.progress ?? 0,
    createdAt: Timestamp.fromDate(parseSqliteDate(t.createdAt)),
    players,
    livery: livery
      ? {
          carTemplate: ["01", "02", "03", "04", "05", "06", "07"].includes(String(livery.carTemplate))
            ? String(livery.carTemplate)
            : "01",
          primaryColor: livery.primaryColor,
          secondaryColor: livery.secondaryColor,
          tertiaryColor: livery.tertiaryColor ?? "#8D99AE",
          carNumber: livery.carNumber
        }
      : null
  });
}

if (teams.length > 0) {
  await batch.commit();
}

const race = sqlite.prepare("SELECT * FROM RaceUpdate WHERE id = 1").get();
if (race) {
  await firestore
    .collection("config")
    .doc("raceUpdate")
    .set({
      teamId: race.teamId ?? null,
      teamName: race.teamName ?? "Race Control",
      message: race.message ?? "",
      delta: race.delta ?? 0,
      accentColor: race.accentColor ?? "#FFFFFF",
      updatedAt: Timestamp.fromDate(parseSqliteDate(race.updatedAt))
    });
}

const timer = sqlite.prepare("SELECT * FROM EventTimer WHERE id = 1").get();
if (timer) {
  await firestore
    .collection("config")
    .doc("eventTimer")
    .set({
      status: timer.status ?? "idle",
      startedAt: timer.startedAt ? Timestamp.fromDate(parseSqliteDate(timer.startedAt)) : null,
      baseDurationSec: timer.baseDurationSec ?? 60,
      extendedSec: timer.extendedSec ?? 0,
      updatedAt: FieldValue.serverTimestamp()
    });
}

sqlite.close();
console.log(`Migrated ${teams.length} team(s), race update, and event timer.`);
