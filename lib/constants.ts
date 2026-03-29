export const TEAM_LIMIT = 6;
/** Five fixed pit-lane roles; registration requires one roster player per role. */
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 5;

export const TEAM_ROLES = [
  { title: "Gunners", subtitle: "Drive Directions" },
  { title: "Jack Operators", subtitle: "Take the product to the next level" },
  { title: "Wing Adjusters", subtitle: "Highlight opportunities" },
  { title: "Stabilizers", subtitle: "Maintain quality in the product" },
  { title: "Lollipop Man", subtitle: "Release Authority" }
] as const;
export const DEFAULT_BASE_DURATION_SEC = 60;
