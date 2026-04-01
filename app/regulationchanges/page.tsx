"use client";

import { useMemo } from "react";
import { EventBrandLogos } from "@/components/EventBrandLogos";
import { RegulationChangeTeamCard } from "@/components/RegulationChangeTeamCard";
import { useEventState } from "@/lib/useEventState";

export default function RegulationChangesPage() {
  const { data, loading, error, refresh } = useEventState(true);

  const teamsSorted = useMemo(() => {
    const list = data?.teams ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [data?.teams]);

  return (
    <main className="page-shell regulation-changes-page">
      <header className="regulation-changes-header">
        <div className="regulation-changes-brand">
          <EventBrandLogos variant="regulation" />
        </div>
        <h1>Regulation changes</h1>
      </header>

      {loading && !data ? (
        <p className="muted regulation-changes-loading">Loading teams…</p>
      ) : error && !data ? (
        <div className="panel admin-state-fallback regulation-changes-fallback">
          <p className="error-text">{error}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : !teamsSorted.length ? (
        <p className="muted regulation-changes-loading">No teams registered yet.</p>
      ) : (
        <div className="regulation-changes-grid" role="list">
          {teamsSorted.map((team) => (
            <div key={team.id} className="regulation-changes-grid-cell" role="listitem">
              <RegulationChangeTeamCard team={team} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
