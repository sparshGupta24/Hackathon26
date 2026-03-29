import type { LiveryState } from "@/lib/types";

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
