"use client";

import Link from "next/link";
import { EventBrandLogos } from "@/components/EventBrandLogos";
import { MissionRevealCard } from "@/components/MissionRevealCard";
import { useEventState } from "@/lib/useEventState";

export default function MissionRevealPage() {
  const { data, loading, error, refresh } = useEventState(true);

  return (
    <main className="page-shell mission-reveal-page">
      <header className="team-awards-header mission-reveal-header">
        <div className="mission-reveal-header-brand">
          <EventBrandLogos variant="mission" />
        </div>
        <h1>Mission reveal</h1>
        <div className="mission-reveal-header-actions">
          <Link href="/arena1" className="session-alert-1-next" aria-label="Next">
            Next
          </Link>
        </div>
      </header>

      {loading && !data ? (
        <p className="muted team-awards-loading">Loading teams…</p>
      ) : error && !data ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : !data?.teams.length ? (
        <p className="muted team-awards-loading">No teams registered yet.</p>
      ) : (
        <div className="mission-reveal-row-outer">
          <div className="mission-reveal-row" role="list">
            {data.teams.map((team) => (
              <div key={team.id} className="mission-reveal-row-item" role="listitem">
                <MissionRevealCard team={team} />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
