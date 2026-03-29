import type { VoteCategoryId } from "@/lib/voteCategories";

export interface VoteTallyEntry {
  playerId: string;
  teamId: string;
  count: number;
}

export interface VoteTallies {
  byCategory: Record<VoteCategoryId, VoteTallyEntry[]>;
}

/** All entries tied for the maximum count (non-empty list has at least one). */
export function topVoteRecipients(entries: VoteTallyEntry[]): VoteTallyEntry[] {
  if (!entries.length) {
    return [];
  }
  const max = entries[0]!.count;
  return entries.filter((e) => e.count === max);
}
