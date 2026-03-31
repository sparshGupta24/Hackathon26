import type { Metadata } from "next";
import { SessionAlertSlide } from "@/components/SessionAlertSlide";

export const metadata: Metadata = {
  title: "AI 101 with Tarun"
};

export default function SessionAlert1Page() {
  return (
    <SessionAlertSlide
      title="AI 101"
      subtitle="with Tarun"
      visual="brain"
      visualAriaLabel="Brain"
      nextHref="/missionreveal"
    />
  );
}
