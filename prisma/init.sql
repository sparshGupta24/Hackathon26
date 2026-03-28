PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Team" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Player" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slot" INTEGER NOT NULL,
  CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Player_teamId_slot_key" ON "Player"("teamId", "slot");

CREATE TABLE IF NOT EXISTS "Livery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "preset" TEXT NOT NULL,
  "primaryColor" TEXT NOT NULL,
  "secondaryColor" TEXT NOT NULL,
  "carNumber" INTEGER NOT NULL,
  CONSTRAINT "Livery_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Livery_teamId_key" ON "Livery"("teamId");

CREATE TABLE IF NOT EXISTS "EventTimer" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'idle' CHECK ("status" IN ('idle', 'running', 'ended')),
  "startedAt" DATETIME,
  "baseDurationSec" INTEGER NOT NULL DEFAULT 60,
  "extendedSec" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "EventTimer" ("id", "status", "baseDurationSec", "extendedSec", "updatedAt")
VALUES (1, 'idle', 60, 0, CURRENT_TIMESTAMP);
