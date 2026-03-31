/** Individual nomination categories; one pick per category per ballot. */
export const VOTE_CATEGORIES = [
  {
    id: "prompt_wizard",
    label: "Certified Prompt Wizard",
    description: "Master of vibe coding / prompting"
  },
  {
    id: "bug_whisperer",
    label: "Bug Whisperer",
    description: "Solved critical issues smoothly"
  },
  {
    id: "fresh_tires",
    label: "Fresh Tires",
    description: "Best first-time participant"
  },
  {
    id: "chaos_controller",
    label: "Chaos Controller",
    description: "Managed confusion, kept team aligned"
  },
  {
    id: "lights_out_performer",
    label: "Lights Out Performer",
    description: "Owned the room with confidence & presence"
  },
  {
    id: "clutch_performer",
    label: "Clutch Performer",
    description: "Delivered under pressure at key moments"
  },
  {
    id: "voice_of_grid",
    label: "Voice of the Grid",
    description: "Best storyteller / presenter"
  },
  {
    id: "tireless_driver",
    label: "Tireless Driver",
    description: "Worked relentlessly throughout the hackathon"
  }
] as const;

export type VoteCategoryId = (typeof VOTE_CATEGORIES)[number]["id"];

export function isVoteCategoryId(s: string): s is VoteCategoryId {
  return VOTE_CATEGORIES.some((c) => c.id === s);
}
