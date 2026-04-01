/** Registration challenge prompts: 9 locked rows across three slots (same index on all reels). */

export const PROMPT_PERMUTATION_COUNT = 9;

/** Slot 1 — Your users */
export const REGISTRATION_SLOT_USERS = [
  "Monks",
  "Aliens",
  "Politicians",
  "Wizards",
  "Kids",
  "Time traveler",
  "Gangsters",
  "Superheros",
  "Vampire"
] as const;

/** Slot 2 — Your context */
export const REGISTRATION_SLOT_CONTEXT = [
  "Professional networking",
  "Astrology",
  "Dating",
  "Personal grooming",
  "Daily news",
  "Ride hailing",
  "Mindfulness",
  "Travel itinerary",
  "Grocery shopping"
] as const;

/** Slot 3 — Your direction */
export const REGISTRATION_SLOT_DIRECTION = [
  "Use poetic, rhythmic language with gentle alliteration.",
  "Use partially familiar but imperfect human language.",
  "Frame interactions as agreements, tenders, or contracts.",
  "Frame every action as casting a spell.",
  "Frame information with a passive-aggressive tone.",
  "Mix past, present, and future tense when describing actions.",
  "Use threatening, intimidating language. Deliver advice with a sarcastic edge.",
  "Frame plans like a lab report or mission log.",
  "Use Shakespearean-style language."
] as const;

export function composeRegistrationPrompt(index: number): string {
  const u = REGISTRATION_SLOT_USERS[index];
  const c = REGISTRATION_SLOT_CONTEXT[index];
  const d = REGISTRATION_SLOT_DIRECTION[index];
  if (u === undefined || c === undefined || d === undefined) {
    throw new Error("Invalid prompt permutation index");
  }
  return `${u} — ${c} — ${d}`;
}

export function isValidPermutationIndex(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n < PROMPT_PERMUTATION_COUNT;
}
