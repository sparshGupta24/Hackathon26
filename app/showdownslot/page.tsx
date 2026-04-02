"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShowdownTeamFullscreenModal } from "@/components/ShowdownTeamFullscreenModal";
import type { TeamState } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

const GRID_SLOTS = 6;

function sortTeams(teams: TeamState[]): TeamState[] {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export default function ShowdownSlotPage() {
  const { data, loading, error, refresh } = useEventState(true);
  const displaySlots = useMemo(() => {
    const sorted = sortTeams(data?.teams ?? []);
    return Array.from({ length: GRID_SLOTS }, (_, i) => sorted[i] ?? null);
  }, [data?.teams]);

  const [spinning, setSpinning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  /** Cumulative ids of every team the lever has already landed on (frontend only). */
  const [landedTeamIds, setLandedTeamIds] = useState<string[]>([]);
  const [modalTeam, setModalTeam] = useState<TeamState | null>(null);

  const spinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) {
        clearInterval(spinTimerRef.current);
      }
    };
  }, []);

  const pullLever = useCallback(() => {
    if (spinning || modalTeam !== null) {
      return;
    }

    const pool = displaySlots.filter((t): t is TeamState => t != null);
    if (pool.length === 0) {
      return;
    }

    let eligible = pool.filter((t) => !landedTeamIds.includes(t.id));
    let resetLandedForThisPull = false;
    if (eligible.length === 0) {
      eligible = pool;
      resetLandedForThisPull = true;
    }

    const winner = eligible[Math.floor(Math.random() * eligible.length)]!;
    const targetIndex = displaySlots.findIndex((t) => t?.id === winner.id);
    if (targetIndex < 0) {
      return;
    }

    const jitterIndices = eligible
      .map((t) => displaySlots.findIndex((s) => s?.id === t.id))
      .filter((i) => i >= 0);
    const jitterPool = jitterIndices.length > 0 ? jitterIndices : displaySlots.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);

    if (spinTimerRef.current !== null) {
      clearInterval(spinTimerRef.current);
      spinTimerRef.current = null;
    }

    setSpinning(true);
    setHighlightedIndex(null);

    let frame = 0;
    const totalFrames = 28;
    const tickMs = 85;

    spinTimerRef.current = window.setInterval(() => {
      frame++;
      if (frame < totalFrames - 4) {
        const jitter = jitterPool[Math.floor(Math.random() * jitterPool.length)]!;
        setHighlightedIndex(jitter);
      } else {
        setHighlightedIndex(targetIndex);
      }

      if (frame >= totalFrames) {
        if (spinTimerRef.current !== null) {
          clearInterval(spinTimerRef.current);
          spinTimerRef.current = null;
        }
        setHighlightedIndex(targetIndex);
        setSpinning(false);
        setModalTeam(winner);
        setLandedTeamIds((prev) => (resetLandedForThisPull ? [winner.id] : [...prev, winner.id]));
      }
    }, tickMs);
  }, [displaySlots, landedTeamIds, modalTeam, spinning]);

  function closeModal() {
    setModalTeam(null);
  }

  return (
    <main className="page-shell showdown-slot-page">
      <header className="showdown-slot-header">
        <div>
          <p className="kicker">Showdown</p>
          <h1>Slot pick</h1>
          <p className="muted small">
            Pull the lever to land on a team. Teams you have already landed on stay out of the pool until everyone on
            the grid has had a turn, then the list resets (this page only — nothing is saved).
          </p>
        </div>
        <div className="showdown-slot-header-actions">
          <Link href="/home" className="btn-secondary">
            Home
          </Link>
        </div>
      </header>

      {loading && !data ? (
        <p className="muted showdown-slot-loading">Loading teams…</p>
      ) : error && !data ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="showdown-slot-stage">
          <div className="showdown-slot-grid-wrap">
            <div className="showdown-slot-grid" role="group" aria-label="Teams in the pool">
              {displaySlots.map((team, i) => {
                const isHot = highlightedIndex === i;
                return (
                  <div
                    key={team?.id ?? `empty-${i}`}
                    className={`showdown-slot-cell${isHot ? " showdown-slot-cell--hot" : ""}${spinning && !isHot ? " showdown-slot-cell--dim" : ""}`}
                    aria-current={isHot ? "true" : undefined}
                  >
                    <span className="showdown-slot-cell-name">{team?.name ?? "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="showdown-slot-lever-aside" aria-label="Lever">
            <div className="pg-slot-chrome showdown-slot-chrome">
              <div className="pg-slot-lamps" aria-hidden />
              <div className="pg-am-lever-host showdown-slot-lever-host">
                <button
                  type="button"
                  className={`am-lever ${spinning ? "am-lever--pulled" : ""}`}
                  onClick={pullLever}
                  disabled={spinning || modalTeam !== null || displaySlots.every((t) => t == null)}
                  aria-label={modalTeam ? "Close the dialog first, then pull again" : "Pull lever to pick a team"}
                  aria-busy={spinning}
                />
              </div>
              <p className="muted small showdown-slot-lever-hint">
                {modalTeam ? "Close the dialog to pull again" : "Pull to pick"}
              </p>
            </div>
          </aside>
        </div>
      )}

      {modalTeam ? <ShowdownTeamFullscreenModal team={modalTeam} onClose={closeModal} /> : null}
    </main>
  );
}
