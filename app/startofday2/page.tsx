import type { Metadata } from "next";
import { SessionAlertSlide } from "@/components/SessionAlertSlide";

export const metadata: Metadata = {
  title: "Day 2"
};

export default function StartOfDay2Page() {
  return (
    <SessionAlertSlide
      title="Welcome back to Day 2"
      visual="logo"
      visualAriaLabel="Event and Grand Prix logos"
      nextHref="/regulationchanges"
    />
  );
}
