import { describe, expect, it } from "vitest";
import { formatTimerLabel, getRemainingSeconds, shouldAutoEnd, totalDurationSec } from "@/lib/timer";

describe("timer utilities", () => {
  it("computes total duration from base + extension", () => {
    expect(totalDurationSec({ baseDurationSec: 60, extendedSec: 600 })).toBe(660);
  });

  it("returns full time while timer is idle", () => {
    const remaining = getRemainingSeconds(
      { status: "idle", startedAt: null, baseDurationSec: 60, extendedSec: 300 },
      Date.now()
    );

    expect(remaining).toBe(360);
  });

  it("counts down in running mode", () => {
    const now = Date.now();
    const remaining = getRemainingSeconds(
      {
        status: "running",
        startedAt: new Date(now - 11_000).toISOString(),
        baseDurationSec: 60,
        extendedSec: 0
      },
      now
    );

    expect(remaining).toBe(49);
  });

  it("auto-ends when time reaches zero", () => {
    const now = Date.now();
    const done = shouldAutoEnd(
      {
        status: "running",
        startedAt: new Date(now - 65_000),
        baseDurationSec: 60,
        extendedSec: 0
      },
      now
    );

    expect(done).toBe(true);
  });

  it("does not auto-end while running with no start time (corrupt doc)", () => {
    expect(
      shouldAutoEnd({
        status: "running",
        startedAt: null,
        baseDurationSec: 60,
        extendedSec: 0
      })
    ).toBe(false);
  });

  it("formats mm:ss labels", () => {
    expect(formatTimerLabel(0)).toBe("00:00");
    expect(formatTimerLabel(125)).toBe("02:05");
  });
});
