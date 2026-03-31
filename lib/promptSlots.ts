/**
 * Shared slot lists & helpers for the prompt generator (registration step 2 + /prompt-generator).
 * Reel metrics must match `--pg-item-h` and `--pg-visible` in globals.css.
 */

export const SLOT_ONE = [
  "A five-year-old",
  "A very sleepy sloth",
  "A golden retriever",
  "A confused medieval knight",
  "A goldfish with a three-second memory",
  "A Victorian butler",
  "A retired grandmother",
  "A dramatic opera singer",
  "A rubber duck",
  "A sentient vending machine"
] as const;

export const SLOT_TWO = [
  "Approve or reject applications",
  "Schedule and manage appointments",
  "Onboard and verify new members",
  "Assign and track tasks",
  "Process and respond to complaints",
  "Deliver performance reviews",
  "Manage bookings and reservations",
  "Submit and track expense reports",
  "Run a live auction",
  "Moderate and publish content"
] as const;

export const SLOT_THREE = [
  "A team of Nobel Prize-winning scientists",
  "A squad of impatient NFL quarterbacks",
  "A cohort of Michelin-star chefs",
  "A panel of Fortune 500 CEOs",
  "A delegation of intergalactic diplomats",
  "A crew of elite Navy SEALs",
  "A group of world-famous architects",
  "A league of professional esports champions",
  "A council of ancient Roman emperors",
  "A roster of Grammy-winning musicians"
] as const;

export const REEL_COPIES = 7;
export const ITEM_PX = 78;
export const VISIBLE_ROWS = 5;
export const CENTER_ROW = (VISIBLE_ROWS - 1) / 2;

/** Each reel stops in sequence: reel 1, then 2, then 3 (ms from spin start). */
export const REEL_STOP_MS = [2200, 3200, 4200] as const;

export function pickRandomIndex(len: number): number {
  return Math.floor(Math.random() * len);
}

export function buildStrip(items: readonly string[]): string[] {
  return Array.from({ length: REEL_COPIES }, () => [...items]).flat();
}

export function finalScrollForWinner(winnerIdx: number, len: number): number {
  const rotations = 2 + Math.floor(Math.random() * 3);
  const g = rotations * len + winnerIdx;
  return (g - CENTER_ROW) * ITEM_PX;
}

export function composePrompt(a: string, b: string, c: string): string {
  return `${a} needs to ${b} for ${c}`;
}

/** Lowercase first character for inline sentence flow (phrase may start with "A "). */
export function leadLower(s: string): string {
  if (!s) {
    return s;
  }
  return s.charAt(0).toLowerCase() + s.slice(1);
}
