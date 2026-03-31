import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EventRunFlowNav } from "@/components/EventRunFlowNav";
import { IdleAudio } from "@/components/IdleAudio";
import { GP_LOGO_PNG } from "@/lib/eventLogo";

export const metadata: Metadata = {
  title: "Idle"
};

export default function IdlePage() {
  return (
    <main className="idle-screen">
      <div className="idle-top-bar">
        <Link href="/home" className="idle-back" aria-label="Back to home">
          ← Back
        </Link>
        <EventRunFlowNav current="opening" />
      </div>
      <Image
        src={GP_LOGO_PNG}
        alt="Grand Prix"
        width={421}
        height={305}
        className="idle-screen-logo"
        priority
        sizes="(max-width: 640px) 80vw, 448px"
      />
      <IdleAudio />
      <Link href="/formation" className="idle-proceed-layer" aria-label="Continue to formation grid">
        <span className="idle-proceed-hint">Click to proceed</span>
      </Link>
    </main>
  );
}
