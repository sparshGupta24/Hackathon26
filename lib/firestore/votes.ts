import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { VOTE_CATEGORIES, type VoteCategoryId, isVoteCategoryId } from "@/lib/voteCategories";
import type { TeamState } from "@/lib/types";
import type { VoteTallies, VoteTallyEntry } from "@/lib/voteTally";
import { VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE } from "@/lib/voteConfig";

const COL_VOTES = "audienceVotes";

export type { VoteTallies, VoteTallyEntry } from "@/lib/voteTally";

function emptyCategoryMaps(): Record<VoteCategoryId, Map<string, { teamId: string; count: number }>> {
  return Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, new Map()])) as Record<
    VoteCategoryId,
    Map<string, { teamId: string; count: number }>
  >;
}

export async function hasVoterSubmitted(voterId: string): Promise<boolean> {
  if (!VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
    return false;
  }
  const db = getDb();
  const first = VOTE_CATEGORIES[0]!.id;
  const snap = await db.collection(COL_VOTES).doc(`${voterId}__${first}`).get();
  return snap.exists;
}

export async function submitVoteBallot(input: {
  voterId: string;
  votes: Record<VoteCategoryId, { playerId: string; teamId: string }>;
}): Promise<void> {
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  const baseVoter = { voterId: input.voterId, createdAt: now };

  for (const c of VOTE_CATEGORIES) {
    const v = input.votes[c.id];
    if (!v?.playerId || !v?.teamId) {
      throw new Error("INCOMPLETE_BALLOT");
    }
  }

  if (VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
    const refs = VOTE_CATEGORIES.map((c) => db.collection(COL_VOTES).doc(`${input.voterId}__${c.id}`));
    await db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      if (snaps.some((s) => s.exists)) {
        throw new Error("ALREADY_VOTED");
      }
      for (let i = 0; i < VOTE_CATEGORIES.length; i++) {
        const cat = VOTE_CATEGORIES[i]!;
        const sel = input.votes[cat.id];
        tx.set(refs[i]!, {
          ...baseVoter,
          category: cat.id,
          playerId: sel.playerId,
          teamId: sel.teamId
        });
      }
    });
    return;
  }

  const batch = db.batch();
  for (const c of VOTE_CATEGORIES) {
    const sel = input.votes[c.id];
    const ref = db.collection(COL_VOTES).doc();
    batch.set(ref, {
      ...baseVoter,
      category: c.id,
      playerId: sel.playerId,
      teamId: sel.teamId
    });
  }
  await batch.commit();
}

export async function getVoteTallies(): Promise<VoteTallies> {
  const db = getDb();
  const snap = await db.collection(COL_VOTES).get();
  const counts = emptyCategoryMaps();

  for (const doc of snap.docs) {
    const d = doc.data();
    const cat = d.category;
    const playerId = String(d.playerId ?? "");
    const teamId = String(d.teamId ?? "");
    if (!isVoteCategoryId(cat) || !playerId) {
      continue;
    }
    const key = `${playerId}__${teamId}`;
    const prev = counts[cat].get(key) ?? { teamId, count: 0 };
    prev.count += 1;
    counts[cat].set(key, prev);
  }

  const toSorted = (m: Map<string, { teamId: string; count: number }>): VoteTallyEntry[] =>
    [...m.entries()]
      .map(([compound, v]) => {
        const playerId = compound.split("__")[0] ?? "";
        return { playerId, teamId: v.teamId, count: v.count };
      })
      .sort((a, b) => b.count - a.count);

  const byCategory = {} as VoteTallies["byCategory"];
  for (const c of VOTE_CATEGORIES) {
    byCategory[c.id] = toSorted(counts[c.id]);
  }

  return { byCategory };
}

/** Any roster player on a registered team may receive a vote in any category. */
export function validateVoteTeamMember(teams: TeamState[], playerId: string, teamId: string): boolean {
  const team = teams.find((t) => t.id === teamId);
  if (!team) {
    return false;
  }
  return team.players.some((pl) => pl.id === playerId);
}
