import { showdownTeamSlug } from "@/lib/showdownSlotTeamImage";

/** Lore blurbs for showdown fullscreen modal (canonical slugs from `showdownTeamSlug`). */
const SHOWDOWN_TEAM_DESCRIPTIONS: Record<string, string> = {
  "blue-hornet":
    "Founded by a disgruntled beekeeper who realized aerodynamics and swarming patterns are surprisingly similar. Their 1998 car famously vibrated so much it once accidentally liquefied a rival team's catering tent.",

  "lemon-cake":
    "Sponsored by a high-end patisserie that used literal powdered sugar as a weight-ballast loophole in the regulations. The car smells delightful at 300 km/h, though it is prone to \"crumbling\" under high-downforce pressure.",

  "schuderia-bailgadi":
    'The pride of rural India, this team insists on using a chassis inspired by traditional bullock carts for "structural integrity." Their pit stops take forty minutes because the mechanics insist on feeding the engine imaginary hay for good luck.',

  "fast-five":
    'Owned by a collective of bank robbers who realized a GP circuit is the only place they can drive that fast without a police escort. Their DRS system is just a button that jettisons "evidence" out of the exhaust pipe to lighten the load.',

  tuis: "Originally a travel agency that got lost on the way to a corporate retreat and accidentally entered a Grand Prix. Their drivers are legally required to wear Hawaiian shirts under their fire suits and offer \"in-flight\" snacks during the safety car.",

  "udan-khatola":
    'Named after the mythical flying carpets, this team claims their floor-effect aerodynamics are actually based on ancient levitation spells. They\'ve been disqualified twice for attempting to bypass the track entirely by "ascending" over Turn 1.'
};

/** Earlier spellings still used in data → canonical slug above. */
const SHOWDOWN_TEAM_SLUG_ALIASES: Record<string, string> = {
  "scuderia-bailgadi": "schuderia-bailgadi",
  "udal-khatola": "udan-khatola"
};

export function showdownTeamDescription(teamName: string): string | undefined {
  const slug = showdownTeamSlug(teamName);
  const key = SHOWDOWN_TEAM_SLUG_ALIASES[slug] ?? slug;
  return SHOWDOWN_TEAM_DESCRIPTIONS[key];
}
