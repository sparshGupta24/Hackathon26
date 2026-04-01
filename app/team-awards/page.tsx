"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TeamAwardCeremonyCard } from "@/components/TeamAwardCeremonyCard";
import { fireAwardConfetti } from "@/lib/awardConfetti";
import type { TeamAwardPresentationItem } from "@/lib/types";

export default function TeamAwardsPage() {
  const [items, setItems] = useState<TeamAwardPresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/team-awards", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load awards");
      }
      const data = (await response.json()) as { items: TeamAwardPresentationItem[] };
      setItems(data.items);
    } catch {
      setError("Unable to load team awards. Check the connection and try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || items.length === 0) {
      return;
    }
    const el = document.getElementById(`team-award-slot-${activeIndex}`);
    window.requestAnimationFrame(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [activeIndex, revealed, loading, items.length]);

  const lastIndex = Math.max(0, items.length - 1);

  const goNext = useCallback(() => {
    if (activeIndex >= lastIndex) {
      setFinished(true);
      return;
    }
    setActiveIndex((i) => i + 1);
    setRevealed(false);
  }, [activeIndex, lastIndex]);

  if (finished) {
    return (
      <main className="page-shell team-awards-page team-awards-page--done">
        <div className="team-awards-done-card panel">
          <p className="kicker">Pixel Prix 2026</p>
          <h1 className="team-awards-done-title">That&apos;s every award</h1>
          <p className="muted">Thanks for celebrating the grid with us.</p>
          <div className="team-awards-done-actions">
            <Link href="/people-awards" className="btn-primary">
              Next
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFinished(false);
                setActiveIndex(0);
                setRevealed(false);
                void load();
              }}
            >
              Run again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell team-awards-page">
      <header className="team-awards-header">
        <p className="kicker">Pixel Prix 2026</p>
        <h1>Team awards</h1>
        <p className="muted small">
          Reveal each category in order. Winners are set from the volunteer portal.
        </p>
        {!loading && items.length > 0 ? (
          <p className="team-awards-progress muted small" aria-live="polite">
            Category {activeIndex + 1} of {items.length}
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className="muted team-awards-loading">Loading awards…</p>
      ) : error ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="muted team-awards-loading">No award categories available.</p>
      ) : (
        <div className="team-awards-stack">
          {items.map((item, i) => {
            const isPast = i < activeIndex;
            const isActive = i === activeIndex;
            const isFuture = i > activeIndex;
            const showBack = isPast || (isActive && revealed);
            return (
              <TeamAwardCeremonyCard
                key={item.key}
                slotId={`team-award-slot-${i}`}
                title={item.title}
                description={item.description}
                team={item.team}
                showBack={showBack}
                isInteractiveFront={isActive && !revealed}
                onRevealClick={() => {
                  fireAwardConfetti();
                  setRevealed(true);
                }}
                showNextCta={isActive && revealed}
                onNext={goNext}
                isLastAward={activeIndex === lastIndex}
                isFuture={isFuture}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
