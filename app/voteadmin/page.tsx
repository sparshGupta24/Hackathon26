"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { EventBrandLogos } from "@/components/EventBrandLogos";
import { VoteAdminAwardsSection } from "@/components/VoteAdminAwardsSection";

export default function VoteAdminPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetVotes = useCallback(async () => {
    if (
      !window.confirm(
        "Delete all audience votes on the server? Vote counts reset to zero and devices can submit new ballots (if single-ballot mode is on)."
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/votes/reset", { method: "POST" });
      const payload = (await response.json()) as { error?: string; deletedCount?: number };
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed");
      }
      const n = typeof payload.deletedCount === "number" ? payload.deletedCount : 0;
      setMessage(n === 0 ? "Vote store was already empty." : `Removed ${n} vote record${n === 1 ? "" : "s"}. Tallies are cleared.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset votes.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <main className="page-shell voteadmin-page">
      <header className="voteadmin-header">
        <div className="voteadmin-brand">
          <EventBrandLogos variant="reg" />
        </div>
        <h1 className="voteadmin-title">Vote admin</h1>
        <p className="muted small voteadmin-lead">
          Confirm audience award winners and reset vote data when needed. Voting UI:{" "}
          <Link href="/vote">/vote</Link>.
        </p>
      </header>

      <VoteAdminAwardsSection />

      <section className="panel voteadmin-panel">
        <h2 className="voteadmin-section-title">Reset vote counts</h2>
        <p className="muted small voteadmin-section-body">
          Permanently deletes every stored ballot entry and clears people-award confirmations (above). Use before a new
          voting session or after testing.
        </p>
        <button type="button" className="btn-primary voteadmin-reset-btn" disabled={busy} onClick={() => void resetVotes()}>
          {busy ? "Resetting…" : "Reset vote counts"}
        </button>
        {message ? <p className="feedback voteadmin-feedback">{message}</p> : null}
        {error ? <p className="error-text voteadmin-feedback">{error}</p> : null}
      </section>

      <p className="voteadmin-back-wrap">
        <Link href="/home" className="btn-secondary">
          Back to home
        </Link>
      </p>
    </main>
  );
}
