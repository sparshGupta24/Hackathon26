export const TEAM_LIMIT = 6;

/** Minimum roster size (all required roles filled). */
export const MIN_PLAYERS = 5;
/** Maximum roster size (required roles + optional Stabiliser #2). */
export const MAX_PLAYERS = 6;

export type TeamRoleDefinition = {
  title: string;
  subtitle: string;
  /** When true, team may register without assigning this slot. */
  optional?: boolean;
};

/** Pit-lane roles in registration order. Slots 0–4 are required; slot 5 (Stabiliser #2) is optional. */
export const TEAM_ROLES: TeamRoleDefinition[] = [
  { title: "Gunners", subtitle: "Drive Directions" },
  { title: "Jack Operators", subtitle: "Take the product to the next level" },
  { title: "Wing Adjusters", subtitle: "Highlight opportunities" },
  { title: "Stabiliser #1", subtitle: "Maintain quality in the product" },
  { title: "Lollipop Man", subtitle: "Release Authority" },
  { title: "Stabiliser #2", subtitle: "Additional quality support", optional: true }
];

export function isOptionalTeamRoleSlot(slotIndex: number): boolean {
  return TEAM_ROLES[slotIndex]?.optional === true;
}

export const REQUIRED_TEAM_ROLE_COUNT = TEAM_ROLES.filter((r) => !r.optional).length;

export const DEFAULT_BASE_DURATION_SEC = 60;
