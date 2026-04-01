import type { Metadata } from "next";
import { EventBrandLogos } from "@/components/EventBrandLogos";

export const metadata: Metadata = {
  title: "Waiting"
};

export default function WaitingPage() {
  return (
    <main className="waiting-page">
      <div className="waiting-page-inner">
        <EventBrandLogos variant="waiting" className="waiting-page-logos" />
        <p className="waiting-page-tagline">
          REFLECT&nbsp;&nbsp;IMPROVE&nbsp;&nbsp;PERFORM <strong className="waiting-page-tagline-strong">TOGETHER</strong>
        </p>
      </div>
    </main>
  );
}
