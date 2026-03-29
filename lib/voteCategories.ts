/** Public voting categories; each maps to a registered pit role title. */
export const VOTE_CATEGORIES = [
  { id: "gunner", label: "Best gunner", roleTitle: "Gunners" },
  { id: "ripper", label: "Best ripper", roleTitle: "Jack Operators" }
] as const;

export type VoteCategoryId = (typeof VOTE_CATEGORIES)[number]["id"];
