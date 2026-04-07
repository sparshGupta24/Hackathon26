"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VOTE_CATEGORIES, type VoteCategoryId } from "@/lib/voteCategories";
import type { EventStateResponse, TeamState } from "@/lib/types";
import type { VoteTallies } from "@/lib/voteTally";

type CategoryAdminMeta = {
  key: VoteCategoryId;
  confirmed: { playerId: string; teamId: string } | null;
};

type DistributionRow = {
  key: string;
  playerId: string;
  teamId: string;
  count: number;
  playerName: string;
  teamName: string;
};

function keyFor(playerId: string, teamId: string): string {
  return `${playerId}__${teamId}`;
}

function parseKey(key: string): { playerId: string; teamId: string } | null {
  const i = key.indexOf("__");
  if (i < 0) {
    return null;
  }
  return { playerId: key.slice(0, i), teamId: key.slice(i + 2) };
}

function playerLabel(teams: TeamState[], playerId: string, teamId: string) {
  const team = teams.find((t) => t.id === teamId);
  const player = team?.players.find((p) => p.id === playerId);
  return {
    playerName: player?.name ?? "Unknown player",
    teamName: team?.name ?? "Unknown team"
  };
}

export default function ViewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamState[]>([]);
  const [tallies, setTallies] = useState<VoteTallies | null>(null);
  const [confirmedByCategory, setConfirmedByCategory] = useState<Record<VoteCategoryId, string | null>>(
    Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, null])) as Record<VoteCategoryId, string | null>
  );
  const [selection, setSelection] = useState<Record<VoteCategoryId, string | null>>(
    Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, null])) as Record<VoteCategoryId, string | null>
  );
  const [savingKey, setSavingKey] = useState<VoteCategoryId | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBanner(null);
    try {
      const [stateRes, votesRes, adminRes] = await Promise.all([
        fetch("/api/state", { cache: "no-store" }),
        fetch("/api/votes", { cache: "no-store" }),
        fetch("/api/admin/people-awards", { cache: "no-store" })
      ]);
      if (!stateRes.ok || !votesRes.ok || !adminRes.ok) {
        throw new Error("Could not load vote data");
      }

      const state = (await stateRes.json()) as EventStateResponse;
      const votesPayload = (await votesRes.json()) as { tallies: VoteTallies };
      const adminPayload = (await adminRes.json()) as { categories: CategoryAdminMeta[] };

      setTeams(state.teams);
      setTallies(votesPayload.tallies);

      const confirmed = Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, null])) as Record<VoteCategoryId, string | null>;
      for (const c of adminPayload.categories) {
        confirmed[c.key] = c.confirmed ? keyFor(c.confirmed.playerId, c.confirmed.teamId) : null;
      }
      setConfirmedByCategory(confirmed);

      const nextSel = Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, null])) as Record<VoteCategoryId, string | null>;
      for (const cat of VOTE_CATEGORIES) {
        const rowsByCategory = votesPayload.tallies.byCategory[cat.id] ?? [];
        if (confirmed[cat.id]) {
          nextSel[cat.id] = confirmed[cat.id];
        } else if (rowsByCategory.length > 0) {
          const first = rowsByCategory[0]!;
          nextSel[cat.id] = keyFor(first.playerId, first.teamId);
        } else if (state.teams.length > 0) {
          const firstTeamWithPlayer = state.teams.find((t) => t.players.length > 0);
          const firstPlayer = firstTeamWithPlayer?.players[0];
          if (firstTeamWithPlayer && firstPlayer) {
            nextSel[cat.id] = keyFor(firstPlayer.id, firstTeamWithPlayer.id);
          }
        }
      }
      setSelection(nextSel);
    } catch {
      setError("Unable to load award distribution.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const distributionByCategory = useMemo(() => {
    const rows = {} as Record<VoteCategoryId, DistributionRow[]>;
    const everyone = teams.flatMap((team) =>
      team.players.map((p) => ({
        key: keyFor(p.id, team.id),
        playerId: p.id,
        teamId: team.id,
        playerName: p.name,
        teamName: team.name
      }))
    );

    for (const cat of VOTE_CATEGORIES) {
      const entries = tallies?.byCategory[cat.id] ?? [];
      const countByKey = new Map(entries.map((e) => [keyFor(e.playerId, e.teamId), e.count] as const));
      rows[cat.id] = everyone
        .map((p) => ({
          key: p.key,
          playerId: p.playerId,
          teamId: p.teamId,
          count: countByKey.get(p.key) ?? 0,
          playerName: p.playerName,
          teamName: p.teamName
        }))
        .sort((a, b) => b.count - a.count || a.playerName.localeCompare(b.playerName));
    }
    return rows;
  }, [tallies, teams]);

  const savePick = useCallback(
    async (categoryId: VoteCategoryId) => {
      const key = selection[categoryId];
      if (!key) {
        return;
      }
      const parsed = parseKey(key);
      if (!parsed) {
        setBanner("Invalid pick.");
        return;
      }

      setSavingKey(categoryId);
      setBanner(null);
      try {
        const response = await fetch("/api/admin/people-awards/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId,
            playerId: parsed.playerId,
            teamId: parsed.teamId
          })
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not save pick");
        }
        setBanner("Pick updated.");
        await load();
      } catch (e) {
        setBanner(e instanceof Error ? e.message : "Could not save pick.");
      } finally {
        setSavingKey(null);
      }
    },
    [load, selection]
  );

  return (
    <main className="page-shell view-page">
      <header className="hero compact">
        <div>
          <p className="kicker">Admin</p>
          <h1>View player awards</h1>
          <p className="muted">
            Vote distribution by category. You can confirm anyone from the registered teams, including nominees with
            zero votes.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/voteadmin" className="btn-secondary">
            Vote admin
          </Link>
          <Link href="/home" className="btn-secondary">
            Home
          </Link>
        </div>
      </header>

      {banner ? <p className="feedback">{banner}</p> : null}
      {loading ? <p className="panel">Loading vote distribution…</p> : null}
      {error ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <section className="view-awards-list">
          {VOTE_CATEGORIES.map((cat) => {
            const rows = distributionByCategory[cat.id] ?? [];
            const topCount = rows[0]?.count ?? null;
            const selected = selection[cat.id];
            const confirmed = confirmedByCategory[cat.id];

            return (
              <article key={cat.id} className="panel view-awards-card">
                <h2 className="view-awards-title">{cat.label}</h2>
                <p className="muted small">{cat.description}</p>

                {rows.length === 0 ? (
                  <p className="muted small">No votes yet.</p>
                ) : (
                  <>
                    <ul className="view-awards-rows" role="list">
                      {rows.map((r) => {
                        const isTop = topCount !== null && topCount > 0 && r.count === topCount;
                        const isChecked = selected === r.key;
                        return (
                          <li key={r.key} className="view-awards-row">
                            <label className="view-awards-row-label">
                              <input
                                type="radio"
                                name={`view-pick-${cat.id}`}
                                checked={isChecked}
                                disabled={savingKey !== null}
                                onChange={() => setSelection((prev) => ({ ...prev, [cat.id]: r.key }))}
                              />
                              <span>
                                <strong>{r.playerName}</strong> <span className="muted">({r.teamName})</span>
                              </span>
                            </label>
                            <span className="view-awards-row-right">
                              <span className="muted small">
                                {r.count} vote{r.count === 1 ? "" : "s"}
                              </span>
                              {isTop ? <span className="view-awards-badge">Top</span> : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="view-awards-actions">
                      <p className="muted small">
                        Current pick:{" "}
                        <strong>
                          {confirmed
                            ? rows.find((r) => r.key === confirmed)?.playerName ?? "Unknown"
                            : "Not confirmed"}
                        </strong>
                      </p>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!selected || savingKey === cat.id}
                        onClick={() => void savePick(cat.id)}
                      >
                        {savingKey === cat.id ? "Saving…" : "Save pick"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
