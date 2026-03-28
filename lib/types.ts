export type TimerStatus = "idle" | "running" | "ended";

export interface PlayerState {
  id: string;
  name: string;
  slot: number;
}

export interface LiveryState {
  preset: string;
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
