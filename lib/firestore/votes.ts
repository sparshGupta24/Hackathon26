import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import type { VoteCategoryId } from "@/lib/voteCategories";
import { VOTE_CATEGORIES } from "@/lib/voteCategories";
import type { TeamState } from "@/lib/types";
import type { VoteTallies, VoteTallyEntry } from "@/lib/voteTally";
import { VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE } from "@/lib/voteConfig";

const COL_VOTES = "audienceVotes";

export type { VoteTallies, VoteTallyEntry } from "@/lib/voteTally";

function isVoteCategoryId(s: string): s is VoteCategoryId {
  return VOTE_CATEGORIES.some((c) => c.id === s);
}

export async function hasVoterSubmitted(voterId: string): Promise<boolean> {
  if (!VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
    return false;
  }
  const db = getDb();
  const snap = await db.collection(COL_VOTES).doc(`${voterId}__gunner`).get();
  return snap.exists;
}

export async function submitVotePair(input: {
  voterId: string;
  gunner: { playerId: string; teamId: string };
  ripper: { playerId: string; teamId: string };
}): Promise<void> {
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  const base = {
    voterId: input.voterId,
    createdAt: now
  };

  if (VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
    const gRef = db.collection(COL_VOTES).doc(`${input.voterId}__gunner`);
    const rRef = db.collection(COL_VOTES).doc(`${input.voterId}__ripper`);

    await db.runTransaction(async (tx) => {
      const [gSnap, rSnap] = await Promise.all([tx.get(gRef), tx.get(rRef)]);
      if (gSnap.exists || rSnap.exists) {
        throw new Error("ALREADY_VOTED");
      }
      tx.set(gRef, {
        ...base,
        category: "gunner",
        playerId: input.gunner.playerId,
        teamId: input.gunner.teamId
      });
      tx.set(rRef, {
        ...base,
        category: "ripper",
        playerId: input.ripper.playerId,
        teamId: input.ripper.teamId
      });
    });
    return;
  }

  const batch = db.batch();
  const gRef = db.collection(COL_VOTES).doc();
  const rRef = db.collection(COL_VOTES).doc();
  batch.set(gRef, {
    ...base,
    category: "gunner",
    playerId: input.gunner.playerId,
    teamId: input.gunner.teamId
  });
  batch.set(rRef, {
    ...base,
    category: "ripper",
    playerId: input.ripper.playerId,
    teamId: input.ripper.teamId
  });
  await batch.commit();
}

export async function getVoteTallies(): Promise<VoteTallies> {
  const db = getDb();
  const snap = await db.collection(COL_VOTES).get();
  const counts: Record<VoteCategoryId, Map<string, { teamId: string; count: number }>> = {
    gunner: new Map(),
    ripper: new Map()
  };

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

  return {
    byCategory: {
      gunner: toSorted(counts.gunner),
      ripper: toSorted(counts.ripper)
    }
  };
}

/** Any roster player on a registered team may receive a vote in any category. */
export function validateVoteTeamMember(teams: TeamState[], playerId: string, teamId: string): boolean {
  const team = teams.find((t) => t.id === teamId);
  if (!team) {
    return false;
  }
  return team.players.some((pl) => pl.id === playerId);
}

export function validateVoteAgainstTeams(
  teams: TeamState[],
  category: VoteCategoryId,
  playerId: string,
  teamId: string
): boolean {
  const roleTitle = VOTE_CATEGORIES.find((c) => c.id === category)?.roleTitle;
  if (!roleTitle) {
    return false;
  }
  const team = teams.find((t) => t.id === teamId);
  if (!team) {
    return false;
  }
  const p = team.players.find((pl) => pl.id === playerId);
  return Boolean(p && p.roleTitle === roleTitle);
}
