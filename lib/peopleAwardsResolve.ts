import type { PeopleAwardWinnerPresentation, TeamState } from "@/lib/types";
import type { VoteTallyEntry } from "@/lib/voteTally";
import { topVoteRecipients } from "@/lib/voteTally";

export function buildPeopleAwardWinnerPresentation(
  pick: { playerId: string; teamId: string },
  teams: TeamState[]
): { winner: PeopleAwardWinnerPresentation; team: TeamState | null } {
  const team = teams.find((t) => t.id === pick.teamId) ?? null;
  const player = team?.players.find((p) => p.id === pick.playerId) ?? null;
  if (!player) {
    return {
      winner: {
        playerId: pick.playerId,
        teamId: pick.teamId,
        name: "Unknown player",
        teamName: team?.name ?? "Unknown team"
      },
      team
    };
  }
  return {
    winner: {
      playerId: player.id,
      teamId: pick.teamId,
      name: player.name,
      photoUrl: player.photoUrl,
      teamName: team?.name ?? "Team"
    },
    team
  };
}

/**
 * Ceremony resolution:
 * - Stored confirmation (e.g. from /view or vote admin) always wins for display, even if not a top vote-getter.
 * - Otherwise: sole vote leader wins; ties with no confirmation stay pending.
 */
export function resolvePeopleAwardForCeremony(
  teams: TeamState[],
  entries: VoteTallyEntry[],
  confirmation: { playerId: string; teamId: string } | undefined
): {
  winner: PeopleAwardWinnerPresentation | null;
  team: TeamState | null;
  leaders: VoteTallyEntry[];
  awardPendingTieBreak: boolean;
} {
  const leaders = topVoteRecipients(entries);

  if (confirmation) {
    const { winner, team } = buildPeopleAwardWinnerPresentation(confirmation, teams);
    return { winner, team, leaders, awardPendingTieBreak: false };
  }

  if (!leaders.length) {
    return { winner: null, team: null, leaders: [], awardPendingTieBreak: false };
  }

  const isTie = leaders.length > 1;
  if (!isTie) {
    const only = leaders[0]!;
    const { winner, team } = buildPeopleAwardWinnerPresentation(only, teams);
    return { winner, team, leaders, awardPendingTieBreak: false };
  }

  return { winner: null, team: null, leaders, awardPendingTieBreak: true };
}
