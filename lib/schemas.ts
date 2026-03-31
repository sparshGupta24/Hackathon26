import { z } from "zod";
import { CAR_TEMPLATE_IDS } from "@/lib/carSvgs";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/constants";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const personIdSchema = z.string().trim().min(1, "Choose a player from the list");

export const registrationSchema = z
  .object({
    teamName: z.string().trim().min(2, "Team name is required").max(60, "Team name is too long"),
    playerIds: z.array(personIdSchema).min(MIN_PLAYERS).max(MAX_PLAYERS),
    livery: z.object({
      carTemplate: z.enum(CAR_TEMPLATE_IDS),
      primaryColor: z.string().regex(hexColorRegex, "Invalid primary color"),
      secondaryColor: z.string().regex(hexColorRegex, "Invalid secondary color"),
      tertiaryColor: z.string().regex(hexColorRegex, "Invalid tertiary color"),
      carNumber: z.number().int().min(1).max(99)
    })
  })
  .refine((data) => new Set(data.playerIds).size === data.playerIds.length, {
    message: "Each role must be filled by a different person",
    path: ["playerIds"]
  });

export const timerExtendSchema = z.object({
  minutes: z.union([z.literal(5), z.literal(10)])
});

export const teamProgressDeltaSchema = z.union([
  z.literal(-10),
  z.literal(0),
  z.literal(10),
  z.literal(20)
]);

export const teamProgressSchema = z.object({
  teamId: z.string().min(1),
  delta: teamProgressDeltaSchema,
  message: z.string().trim().min(1).max(140)
});

export const deleteTeamSchema = z.object({
  teamId: z.string().trim().min(1, "teamId is required")
});

export const challengePromptSchema = z.object({
  teamId: z.string().trim().min(1, "teamId is required"),
  prompt: z.string().trim().min(12, "Prompt is too short").max(500, "Prompt is too long"),
  spinsUsed: z.number().int().min(1, "Spin at least once").max(3, "At most three spins are allowed")
});

export const missionStatementTextMax = 2000;

export const missionStatementUpdateSchema = z.object({
  teamId: z.string().trim().min(1, "teamId is required"),
  statement: z.string().trim().max(missionStatementTextMax, "Mission statement is too long")
});
