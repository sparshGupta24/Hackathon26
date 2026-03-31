"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { VoteWinnerTile } from "@/components/VoteWinnerTile";
import { VOTE_CATEGORIES, type VoteCategoryId } from "@/lib/voteCategories";
import { topVoteRecipients, type VoteTallyEntry } from "@/lib/voteTally";
import type { TeamState } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

interface TalliesPayload {
  tallies?: {
    byCategory: Record<VoteCategoryId, VoteTallyEntry[]>;
  };
}

function teamById(teams: TeamState[], id: string): TeamState | null {
  return teams.find((t) => t.id === id) ?? null;
}

function playerOnTeam(team: TeamState | null, playerId: string) {
  return team?.players.find((p) => p.id === playerId) ?? null;
}

export default function VotingResultsPage() {
  const { data, loading, error, refresh } = useEventState(true);
  const [revealed, setRevealed] = useState(false);
  const [tallies, setTallies] = useState<TalliesPayload["tallies"] | null>(null);
  const [tallyLoading, setTallyLoading] = useState(false);
  const [tallyError, setTallyError] = useState<string | null>(null);

  const teams = data?.teams ?? [];

  const fetchTallies = useCallback(async () => {
    setTallyLoading(true);
    setTallyError(null);
    try {
      const r = await fetch("/api/votes", { cache: "no-store" });
      if (!r.ok) {
        throw new Error("Bad response");
      }
      const j = (await r.json()) as TalliesPayload;
      setTallies(j.tallies ?? null);
    } catch {
      setTallyError("Could not load vote counts.");
    } finally {
      setTallyLoading(false);
    }
  }, []);

  const handleReveal = () => {
    void fetchTallies();
    setRevealed(true);
  };

  const winnersByCategory = useMemo(() => {
    const out: Record<VoteCategoryId, VoteTallyEntry[]> = {} as Record<VoteCategoryId, VoteTallyEntry[]>;
    for (const c of VOTE_CATEGORIES) {
      const list = tallies?.byCategory[c.id] ?? [];
      out[c.id] = topVoteRecipients(list);
    }
    return out;
  }, [tallies]);

  return (
    <main className="page-shell">
      <header className="hero compact">
        <div>
          <p className="kicker">Results</p>
          <h1>Voting results</h1>
          <p className="muted">Live tally from audience ballots. Reveal shows leaders at that moment; voting can continue.</p>
        </div>
        <div className="hero-actions">
          <Link href="/home" className="btn-secondary">
            Home
          </Link>
          <Link href="/vote" className="btn-secondary">
            Vote
          </Link>
        </div>
      </header>

      {loading && !data ? (
        <p className="panel">Loading…</p>
      ) : !data ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error ?? "Unable to load event state."}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : error ? (
        <p className="panel error-text">{error}</p>
      ) : (
        <section className="panel vote-results-panel">
          <div className="vote-results-cta-wrap">
            {!revealed ? (
              <button type="button" className="btn-primary vote-results-cta" onClick={handleReveal}>
                End voting — reveal results
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary vote-results-cta"
                disabled={tallyLoading}
                onClick={() => void fetchTallies()}
              >
                {tallyLoading ? "Refreshing…" : "Refresh counts"}
              </button>
            )}
            <p className="muted small vote-results-cta-note">
              Reveal loads the current vote totals. Audiences can still vote on <Link href="/vote">/vote</Link> unless you
              stop sharing that link.
            </p>
          </div>

          {revealed ? (
            <>
              {tallyError ? <p className="error-text">{tallyError}</p> : null}

              <div className="vote-results-categories">
                {VOTE_CATEGORIES.map((cat) => {
                  const winners = winnersByCategory[cat.id] ?? [];
                  return (
                    <div key={cat.id} className="vote-results-category">
                      <h2 className="vote-results-category-title">{cat.label}</h2>
                      <p className="muted small vote-results-category-desc">{cat.description}</p>
                      {!winners.length ? (
                        <p className="muted">No votes in this category yet.</p>
                      ) : (
                        <div className="vote-winners-row">
                          {winners.map((w) => {
                            const team = teamById(teams, w.teamId);
                            const pl = playerOnTeam(team, w.playerId);
                            return (
                              <VoteWinnerTile
                                key={`${w.teamId}-${w.playerId}`}
                                categoryLabel={cat.label}
                                playerName={pl?.name ?? "Unknown"}
                                teamName={team?.name ?? "Team"}
                                photoUrl={pl?.photoUrl}
                                team={team}
                                voteCount={w.count}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      )}
    </main>
  );
}
