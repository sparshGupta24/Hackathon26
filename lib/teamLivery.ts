import { parseCarTemplateId, type CarTemplateId } from "./carSvgs";
import type { LiveryState, TeamState } from "./types";

export const FALLBACK_LIVERY: LiveryState = {
  carTemplate: "01",
  primaryColor: "#3a3a42",
  secondaryColor: "#1a1a1f",
  tertiaryColor: "#6b6b78",
  carNumber: 0
};

export function liveryForTeam(team: TeamState): { templateId: CarTemplateId; livery: LiveryState } {
  const livery = team.livery ?? FALLBACK_LIVERY;
  return {
    templateId: parseCarTemplateId(livery.carTemplate) ?? "01",
    livery
  };
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length < 6) {
    return { r: 80, g: 80, b: 90 };
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

function brightness(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Brightest primary/secondary/tertiary — same idea as race map accent. */
export function brightestLiveryHex(livery: LiveryState | null | undefined): string {
  if (!livery) {
    return "#64d2ff";
  }
  const colors = [livery.primaryColor, livery.secondaryColor, livery.tertiaryColor].filter(Boolean);
  if (!colors.length) {
    return "#64d2ff";
  }
  return colors.reduce((best, next) => (brightness(next) > brightness(best) ? next : best));
}
