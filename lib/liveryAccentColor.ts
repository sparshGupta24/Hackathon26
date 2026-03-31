import type { LiveryState } from "@/lib/types";

/** Default when livery is missing or no usable accent (matches app accent). */
export const DEFAULT_LIVERY_ACCENT = "#64d2ff";

/** Luminance below this is treated as “close to black” (WCAG-style relative luminance 0–1). */
const LUMINANCE_TOO_DARK = 0.11;

/** Luminance above this is treated as “close to white”. */
const LUMINANCE_TOO_LIGHT = 0.9;

function hexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

function toHex(r: number, g: number, b: number): string {
  return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;
}

/** Parse #rgb or #rrggbb (case-insensitive). */
export function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  let h = input.trim();
  if (!h) {
    return null;
  }
  if (h.startsWith("#")) {
    h = h.slice(1);
  }
  if (h.length === 3) {
    const r = parseInt(h.slice(0, 1) + h.slice(0, 1), 16);
    const g = parseInt(h.slice(1, 2) + h.slice(1, 2), 16);
    const b = parseInt(h.slice(2, 3) + h.slice(2, 3), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) {
      return null;
    }
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) {
      return null;
    }
    return { r, g, b };
  }
  return null;
}

/** WCAG relative luminance (sRGB), 0 = black, 1 = white. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Chooses the brightest of primary / secondary / tertiary by relative luminance.
 * If that color is too dark, too light, or nothing parses, returns {@link DEFAULT_LIVERY_ACCENT}.
 */
export function pickBrightestLiveryAccent(livery: LiveryState | null | undefined): string {
  if (!livery) {
    return DEFAULT_LIVERY_ACCENT;
  }

  const raw = [livery.primaryColor, livery.secondaryColor, livery.tertiaryColor];
  const parsed: { hex: string; lum: number }[] = [];

  for (const s of raw) {
    const t = typeof s === "string" ? s.trim() : "";
    if (!t) {
      continue;
    }
    const rgb = parseHexColor(t);
    if (!rgb) {
      continue;
    }
    const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
    parsed.push({ hex: toHex(rgb.r, rgb.g, rgb.b), lum });
  }

  if (!parsed.length) {
    return DEFAULT_LIVERY_ACCENT;
  }

  let best = parsed[0]!;
  for (const p of parsed) {
    if (p.lum > best.lum) {
      best = p;
    }
  }

  if (best.lum <= LUMINANCE_TOO_DARK || best.lum >= LUMINANCE_TOO_LIGHT) {
    return DEFAULT_LIVERY_ACCENT;
  }

  return best.hex;
}
