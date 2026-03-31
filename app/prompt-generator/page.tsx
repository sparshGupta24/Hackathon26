"use client";

import Link from "next/link";
import { PromptSlotMachine } from "@/components/PromptSlotMachine";

export default function PromptGeneratorPage() {
  return (
    <main className="page-shell">
      <header className="hero compact">
        <div>
          <p className="kicker">Creative Mode</p>
          <h1>Prompt Generator</h1>
          <p className="muted">Pull the lever to spin the reels and land on a random challenge prompt.</p>
        </div>
        <div className="hero-actions">
          <Link href="/home" className="btn-secondary">
            Home
          </Link>
          <Link href="/arena" className="btn-secondary">
            Arena
          </Link>
        </div>
      </header>

      <PromptSlotMachine />
    </main>
  );
}
