import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IdleAudio } from "@/components/IdleAudio";

export const metadata: Metadata = {
  title: "Idle"
};

export default function IdlePage() {
  return (
    <main className="idle-screen">
      <Link href="/" className="idle-back" aria-label="Back to home">
        ← Back
      </Link>
      <Image
        src="/GPLOGO.png"
        alt="Grand Prix"
        width={421}
        height={305}
        className="idle-screen-logo"
        priority
        sizes="(max-width: 640px) 80vw, 448px"
      />
      <IdleAudio />
    </main>
  );
}
