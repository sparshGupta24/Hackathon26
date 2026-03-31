import type { Metadata } from "next";
import { SessionAlertSlide } from "@/components/SessionAlertSlide";

export const metadata: Metadata = {
  title: "That's a wrap"
};

export default function WrapPage() {
  return (
    <SessionAlertSlide
      title="That's a wrap"
      visual="flag"
      visualAriaLabel="Chequered flag"
      nextHref="/idle"
    />
  );
}
