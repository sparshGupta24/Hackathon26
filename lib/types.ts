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
  /** Fixed role title when registered with the five-role form (e.g. Gunners). */
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
}

export interface EventStateResponse {
  teams: TeamState[];
  timer: TimerState;
  raceUpdate: RaceUpdateState | null;
  serverTime: string;
}
