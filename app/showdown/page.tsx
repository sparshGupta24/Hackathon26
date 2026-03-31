import type { Metadata } from "next";
import { SessionAlertSlide } from "@/components/SessionAlertSlide";

export const metadata: Metadata = {
  title: "Final Showdown"
};

export default function ShowdownPage() {
  return (
    <SessionAlertSlide
      title="Final Showdown"
      visual="trophy"
      visualAriaLabel="Trophy"
      nextHref="/team-awards"
    />
  );
}
