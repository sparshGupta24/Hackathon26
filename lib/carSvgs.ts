/** Public car body SVGs (`public/car_svg01.svg` …). */
export const CAR_TEMPLATE_IDS = ["01", "02", "03", "04", "05", "06", "07"] as const;

export type CarTemplateId = (typeof CAR_TEMPLATE_IDS)[number];

export function carSvgPathForTemplateId(id: CarTemplateId): string {
  return `/car_svg${id}.svg`;
}

export function parseCarTemplateId(value: unknown): CarTemplateId | null {
  const s = String(value ?? "").trim();
  return (CAR_TEMPLATE_IDS as readonly string[]).includes(s) ? (s as CarTemplateId) : null;
}

/** Hex lists applied when the SVG has no named inkscape layers (per-template semantics). */
export type LiveryHexBuckets = {
  primary: string[];
  secondary: string[];
  tertiary: string[];
};

const LEGACY_RED_PRIMARY = [
  "#E60000",
  "#E63030",
  "#D50002",
  "#B80002",
  "#EE2D32",
  "#BF1520",
  "#CC2729",
  "#CC2229",
  "#9A1616",
  "#F06262",
  "#4E1818"
];

const LEGACY_RED_SECONDARY = ["#BD1212", "#980002"];

const LEGACY_ACCENT_TERTIARY = ["#C9A418", "#FFAA00", "#FFF22D", "#435FCF"];

/** Light / silver panels (cockpit, stripes, chrome). */
const LIGHT_PANEL = ["#E6E6E6", "#E0E0E0", "#BEBEBE", "#858585"];

/**
 * Most templates: main body = reds, darker red = secondary, lights + accents = tertiary.
 * Matches `car_svg01`, `02`, `04`–`07` (stripe variants still use the same hex roles).
 */
const STANDARD_RED_HULL: LiveryHexBuckets = {
  primary: LEGACY_RED_PRIMARY,
  secondary: LEGACY_RED_SECONDARY,
  tertiary: [...LIGHT_PANEL, ...LEGACY_ACCENT_TERTIARY]
};

/**
 * `car_svg03` — two distinct reds in the asset are split between primary and secondary:
 * - Primary: bright red `#E60000` only (engine-cover / wing surfaces, rear uprights).
 * - Secondary: deeper reds `#802020`, `#BD1212`, `#B80002` (maroon sidepod, nose, accent strips, mirrors).
 * - Tertiary: light hull + silver aero (`#E6E6E6`, `#E0E0E0`, `#BEBEBE`, `#858585`, …).
 * Structural grays/blacks stay unmapped.
 */
const TEMPLATE_03: LiveryHexBuckets = {
  primary: ["#E60000"],
  secondary: ["#802020", "#BD1212", "#B80002"],
  tertiary: ["#E6E6E6", "#E0E0E0", "#BEBEBE", "#858585", ...LEGACY_ACCENT_TERTIARY]
};

/** Explicit per-template buckets so each file can be tuned independently later. */
export const LIVERY_HEX_BUCKETS_BY_TEMPLATE: Record<CarTemplateId, LiveryHexBuckets> = {
  "01": STANDARD_RED_HULL,
  "02": STANDARD_RED_HULL,
  "03": TEMPLATE_03,
  "04": STANDARD_RED_HULL,
  "05": STANDARD_RED_HULL,
  "06": STANDARD_RED_HULL,
  "07": STANDARD_RED_HULL
};

export function liveryHexBucketsForTemplate(id: CarTemplateId): LiveryHexBuckets {
  return LIVERY_HEX_BUCKETS_BY_TEMPLATE[id];
}
