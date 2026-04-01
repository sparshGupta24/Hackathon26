import confetti from "canvas-confetti";

/** Delay to align with `.team-award-flip-card` transition (~0.75s). */
const REVEAL_SYNC_MS = 420;

/**
 * Full-screen confetti burst for award card reveals. Call when the user clicks “reveal”
 * (state flip is handled separately). Respects reduced motion via canvas-confetti.
 */
export function fireAwardConfetti(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.setTimeout(() => {
    const base = {
      disableForReducedMotion: true,
      zIndex: 9999,
      origin: { x: 0.5, y: 0.58 } as const
    };

    void confetti({
      ...base,
      particleCount: 130,
      spread: 78,
      colors: ["#ff3d2e", "#5ad4ff", "#ffd65a", "#ffffff", "#ff9f66"],
      ticks: 220,
      gravity: 0.95,
      scalar: 1.05,
      startVelocity: 38
    });

    void confetti({
      ...base,
      particleCount: 48,
      spread: 100,
      origin: { x: 0.5, y: 0.42 },
      scalar: 0.72,
      ticks: 170,
      colors: ["#ff3d2e", "#5ad4ff", "#ffd65a"]
    });
  }, REVEAL_SYNC_MS);
}
