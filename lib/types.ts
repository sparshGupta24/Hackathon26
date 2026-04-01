import type { VolunteerAwardKey } from "./volunteerRewards";
import type { VoteCategoryId } from "./voteCategories";

/** Roster entry from Firestore `people` collection (public API shape). */
export interface PersonPublic {
  id: string;
  name: string;
  photoUrl: string;
}

export type TimerStatus = "idle" | "running" | "ended";

export interface PlayerState {
  id: string;
  name: string;
  slot: number;
  /** Copied from the people corpus at registration time for display. */
  photoUrl?: string;
  /** Fixed role title from registration (e.g. Gunners, Stabiliser #1). */
  roleTitle?: string;
}

export interface LiveryState {
  /** Selected `car_svg##` body (e.g. `"01"` … `"07"`). */
  carTemplate: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  carNumber: number;
}

export interface TeamState {
  id: string;
  name: string;
  progress: number;
  createdAt: string;
  players: PlayerState[];
  livery: LiveryState | null;
  /** Challenge prompt from registration step 2 (slot machine), once finalized. */
  challengePrompt?: string;
  /** Locked row index for registration permutations (0–8); unset for legacy teams. */
  promptPermutationIndex?: number;
  /** Always 1 for new registrations (single spin). */
  promptSpinsUsed?: number;
  /** Volunteer-entered mission statement text. */
  missionStatement?: string;
}

export interface RaceUpdateState {
  teamId: string | null;
  teamName: string;
  message: string;
  delta: number;
  accentColor: string;
  updatedAt: string;
}

export interface TimerState {
  status: TimerStatus;
  startedAt: string | null;
  baseDurationSec: number;
  extendedSec: number;
  updatedAt: string;
  totalDurationSec: number;
  remainingSec: number;
  /** When true and status is idle, arena shows the F1 start lights before POST /api/timer/start. */
  startCeremonyPending: boolean;
}

export interface EventStateResponse {
  teams: TeamState[];
  timer: TimerState;
  raceUpdate: RaceUpdateState | null;
  serverTime: string;
}

/** Volunteer portal: one registered team per award (or null). */
export type VolunteerAwardSelection = { teamId: string; teamName: string } | null;

export type VolunteerRewardsState = {
  awards: Record<VolunteerAwardKey, VolunteerAwardSelection>;
  updatedAt: string | null;
};

/** Ceremony page: one row per award with optional resolved team. */
export type TeamAwardPresentationItem = {
  key: VolunteerAwardKey;
  title: string;
  description: string;
  team: TeamState | null;
};

/** Audience vote winner on /people-awards (resolved from tallies). */
export type PeopleAwardWinnerPresentation = {
  playerId: string;
  teamId: string;
  name: string;
  photoUrl?: string;
  teamName: string;
};

/** Ceremony page: one audience nomination category with optional top vote-getter. */
export type PeopleAwardPresentationItem = {
  key: VoteCategoryId;
  title: string;
  description: string;
  winner: PeopleAwardWinnerPresentation | null;
  /** Team entity for livery preview when known. */
  team: TeamState | null;
  /** Votes exist but multiple people are tied for first; set winner on /voteadmin. */
  awardPendingTieBreak?: boolean;
};

export type { VolunteerAwardKey } from "./volunteerRewards";
