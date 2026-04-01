import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import type { VoteCategoryId } from "@/lib/voteCategories";
import { isVoteCategoryId } from "@/lib/voteCategories";

const COL_CONFIG = "config";
const DOC_PEOPLE_AWARD_CONFIRMATIONS = "peopleAwardConfirmations";

export type PeopleAwardConfirmationMap = Partial<
  Record<VoteCategoryId, { playerId: string; teamId: string }>
>;

export async function getPeopleAwardConfirmations(): Promise<PeopleAwardConfirmationMap> {
  const db = getDb();
  const snap = await db.collection(COL_CONFIG).doc(DOC_PEOPLE_AWARD_CONFIRMATIONS).get();
  if (!snap.exists) {
    return {};
  }
  const raw = snap.data()?.winners as Record<string, { playerId?: unknown; teamId?: unknown }> | undefined;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: PeopleAwardConfirmationMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isVoteCategoryId(k)) {
      continue;
    }
    const playerId = typeof v?.playerId === "string" ? v.playerId.trim() : "";
    const teamId = typeof v?.teamId === "string" ? v.teamId.trim() : "";
    if (playerId && teamId) {
      out[k] = { playerId, teamId };
    }
  }
  return out;
}

export async function setPeopleAwardConfirmation(input: {
  categoryId: VoteCategoryId;
  playerId: string;
  teamId: string;
}): Promise<void> {
  const db = getDb();
  const ref = db.collection(COL_CONFIG).doc(DOC_PEOPLE_AWARD_CONFIRMATIONS);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data()?.winners as Record<string, unknown> | undefined) : undefined;
    const winners = { ...(prev && typeof prev === "object" ? prev : {}) };
    winners[input.categoryId] = {
      playerId: input.playerId.trim(),
      teamId: input.teamId.trim()
    };
    tx.set(
      ref,
      {
        winners,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

export async function clearPeopleAwardConfirmations(): Promise<void> {
  const db = getDb();
  await db.collection(COL_CONFIG).doc(DOC_PEOPLE_AWARD_CONFIRMATIONS).delete();
}
