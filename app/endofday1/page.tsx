import type { Metadata } from "next";
import { SessionAlertSlide } from "@/components/SessionAlertSlide";

export const metadata: Metadata = {
  title: "End of Day 1"
};

export default function EndOfDay1Page() {
  return (
    <SessionAlertSlide
      title="End of Day 1- See you tomorrow"
      visual="logo"
      visualAriaLabel="Event and Grand Prix logos"
      nextHref="/startofday2"
    />
  );
}
