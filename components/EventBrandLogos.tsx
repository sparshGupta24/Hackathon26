import { EVENT_LOGO_PNG, GP_LOGO_PNG } from "@/lib/eventLogo";

export type EventBrandLogosVariant =
  | "arena"
  | "mission"
  | "formation"
  | "home"
  | "reg"
  | "sessionSlide"
  | "waiting";

const VARIANT_MODIFIER: Record<EventBrandLogosVariant, string> = {
  arena: "event-brand-pair--arena",
  mission: "event-brand-pair--mission",
  formation: "event-brand-pair--formation",
  home: "event-brand-pair--home",
  reg: "event-brand-pair--reg",
  sessionSlide: "event-brand-pair--session-slide",
  waiting: "event-brand-pair--waiting"
};

/** Event + GP logos, equal height (set per variant in CSS). */
export function EventBrandLogos({ variant, className = "" }: { variant: EventBrandLogosVariant; className?: string }) {
  return (
    <div
      className={`event-brand-pair ${VARIANT_MODIFIER[variant]} ${className}`.trim()}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public assets, matched heights via CSS */}
      <img src={EVENT_LOGO_PNG} alt="" className="event-brand-pair__mark" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static public assets */}
      <img src={GP_LOGO_PNG} alt="" className="event-brand-pair__mark" />
    </div>
  );
}
