import { z } from "zod";

export const VOLUNTEER_AWARDS = [
  {
    key: "fastestLap",
    title: "Fastest Lap Award",
    description: "Best execution / strongest iteration in a short time"
  },
  {
    key: "pitPerfect",
    title: "Pit Perfect",
    description: "Best teamwork & collaboration"
  },
  {
    key: "bestAerodynamics",
    title: "Best Aerodynamics",
    description: "Most visually stunning design"
  },
  {
    key: "raceStrategists",
    title: "Race Strategists",
    description: "Best problem-solving approach"
  },
  {
    key: "crashComeback",
    title: "Crash & Comeback Award",
    description: "Recovered brilliantly from setbacks or pivots"
  },
  {
    key: "boldestOvertake",
    title: "Boldest Overtake",
    description: "Most innovative / unexpected idea or solution"
  },
  {
    key: "grandPrixShowcase",
    title: "Grand Prix Showcase",
    description: "Best demo, storytelling, and final presentation"
  }
] as const;

export type VolunteerAwardKey = (typeof VOLUNTEER_AWARDS)[number]["key"];

const optionalTeamId = z
  .string()
  .transform((s) => {
    const t = s.trim();
    return t === "" ? null : t;
  });

export const volunteerRewardsPayloadSchema = z.object({
  fastestLap: optionalTeamId,
  pitPerfect: optionalTeamId,
  bestAerodynamics: optionalTeamId,
  raceStrategists: optionalTeamId,
  crashComeback: optionalTeamId,
  boldestOvertake: optionalTeamId,
  grandPrixShowcase: optionalTeamId
});

export type VolunteerRewardsPayload = z.infer<typeof volunteerRewardsPayloadSchema>;

export function emptyVolunteerRewardSelections(): Record<VolunteerAwardKey, string> {
  return Object.fromEntries(VOLUNTEER_AWARDS.map((a) => [a.key, ""])) as Record<VolunteerAwardKey, string>;
}
