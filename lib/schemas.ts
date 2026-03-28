import { z } from "zod";
import { LIVERY_PRESETS, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/constants";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const playerNameSchema = z.string().trim().min(1, "Player name is required").max(40, "Player name is too long");

export const registrationSchema = z.object({
  teamName: z.string().trim().min(2, "Team name is required").max(60, "Team name is too long"),
  players: z.array(playerNameSchema).min(MIN_PLAYERS).max(MAX_PLAYERS),
  livery: z.object({
    preset: z.enum(LIVERY_PRESETS),
    primaryColor: z.string().regex(hexColorRegex, "Invalid primary color"),
    secondaryColor: z.string().regex(hexColorRegex, "Invalid secondary color"),
    tertiaryColor: z.string().regex(hexColorRegex, "Invalid tertiary color"),
    carNumber: z.number().int().min(1).max(99)
  })
});

export const loginSchema = z.object({
  passcode: z.string().min(1)
});

export const timerExtendSchema = z.object({
  minutes: z.union([z.literal(5), z.literal(10)])
});

export const teamProgressSchema = z.object({
  teamId: z.string().min(1),
  delta: z.union([z.literal(1), z.literal(-1)]),
  message: z.string().trim().min(1).max(140)
});
