/**
 * Showdown slot fullscreen images live under `public/showdown-teams/{slug}/`.
 * Use one of: full.jpg | full.jpeg | full.png | full.webp (first match wins via onError chain in UI).
 */
export function showdownTeamSlug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "team";
}

export const SHOWDOWN_TEAM_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export function showdownTeamImageSrc(slug: string, extIndex: number): string {
  const ext = SHOWDOWN_TEAM_IMAGE_EXTENSIONS[extIndex] ?? "jpg";
  return `/showdown-teams/${slug}/full.${ext}`;
}
