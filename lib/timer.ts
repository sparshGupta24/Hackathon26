import type { TimerStatus } from "@/lib/types";

export interface TimerCore {
  status: TimerStatus;
  startedAt: Date | string | null;
  baseDurationSec: number;
  extendedSec: number;
}

export function totalDurationSec(timer: Pick<TimerCore, "baseDurationSec" | "extendedSec">): number {
  return Math.max(0, timer.baseDurationSec + timer.extendedSec);
}

export function getRemainingSeconds(timer: TimerCore, nowMs = Date.now()): number {
  const total = totalDurationSec(timer);
  if (timer.status === "idle") {
    return total;
  }

  if (timer.status === "ended") {
    return 0;
  }

  if (!timer.startedAt) {
    return 0;
  }

  const started = new Date(timer.startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((nowMs - started) / 1000));
  return Math.max(0, total - elapsed);
}

export function shouldAutoEnd(timer: TimerCore, nowMs = Date.now()): boolean {
  return timer.status === "running" && getRemainingSeconds(timer, nowMs) <= 0;
}

export function formatTimerLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const mins = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safeSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}
