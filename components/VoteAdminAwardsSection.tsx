"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { VoteCategoryId } from "@/lib/voteCategories";

type LeaderRow = {
  playerId: string;
  teamId: string;
  count: number;
  name: string;
  teamName: string;
  photoUrl?: string;
};

type CategoryAdmin = {
  key: VoteCategoryId;
  title: string;
  description: string;
  leaders: LeaderRow[];
  isTie: boolean;
  needsPick: boolean;
  confirmed: { playerId: string; teamId: string } | null;
  ceremonyWinner: { name: string } | null;
  selectedKey: string | null;
};

function compoundKey(playerId: string, teamId: string): string {
  return `${playerId}__${teamId}`;
}

function parseCompoundKey(key: string): { playerId: string; teamId: string } {
  const sep = "__";
  const i = key.indexOf(sep);
  if (i === -1) {
    throw new Error("Invalid selection key");
  }
  return { playerId: key.slice(0, i), teamId: key.slice(i + sep.length) };
}

export function VoteAdminAwardsSection() {
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/admin/people-awards", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load award data");
      }
      const data = (await response.json()) as { categories: CategoryAdmin[] };
      setCategories(data.categories);
      const sel: Record<string, string> = {};
      for (const c of data.categories) {
        if (c.confirmed) {
          sel[c.key] = compoundKey(c.confirmed.playerId, c.confirmed.teamId);
        } else if (c.selectedKey) {
          sel[c.key] = c.selectedKey;
        } else if (c.leaders.length === 1) {
          const L = c.leaders[0]!;
          sel[c.key] = compoundKey(L.playerId, L.teamId);
        } else if (c.leaders.length > 1) {
          const L = c.leaders[0]!;
          sel[c.key] = compoundKey(L.playerId, L.teamId);
        }
      }
      setSelection(sel);
    } catch {
      setError("Unable to load people awards. Try again.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = useCallback(
    async (cat: CategoryAdmin) => {
      const key = selection[cat.key];
      if (!key || cat.leaders.length === 0) {
        return;
      }
      let playerId: string;
      let teamId: string;
      try {
        ({ playerId, teamId } = parseCompoundKey(key));
      } catch {
        setBanner("Invalid selection.");
        return;
      }
      setBusyKey(cat.key);
      setBanner(null);
      try {
        const response = await fetch("/api/admin/people-awards/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: cat.key, playerId, teamId })
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Confirm failed");
        }
        setBanner(`Saved: ${cat.title}`);
        await load();
      } catch (e) {
        setBanner(e instanceof Error ? e.message : "Could not save.");
      } finally {
        setBusyKey(null);
      }
    },
    [load, selection]
  );

  if (loading) {
    return <p className="muted voteadmin-awards-loading">Loading people awards…</p>;
  }
  if (error) {
    return (
      <div className="voteadmin-awards-error">
        <p className="error-text">{error}</p>
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="panel voteadmin-awards">
      <h2 className="voteadmin-section-title">Award assigning</h2>
      <p className="muted small voteadmin-section-body">
        Each category shows who received the most audience votes. If there is a tie, choose who receives the award, then
        confirm. Confirmed winners appear on{" "}
        <Link href="/people-awards" className="voteadmin-inline-link">
          /people-awards
        </Link>
        .
      </p>
      {banner ? <p className="feedback voteadmin-awards-banner">{banner}</p> : null}

      <div className="voteadmin-awards-list">
        {categories.map((cat) => {
          const sel = selection[cat.key];
          const hasVotes = cat.leaders.length > 0;
          const isConfirmed = Boolean(cat.confirmed);
          const disableConfirm = !hasVotes || busyKey === cat.key || isConfirmed;

          return (
            <div key={cat.key} className="voteadmin-award-card">
              <div className="voteadmin-award-card-head">
                <h3 className="voteadmin-award-title">{cat.title}</h3>
                <p className="muted small voteadmin-award-desc">{cat.description}</p>
                {isConfirmed ? (
                  <p className="voteadmin-award-status voteadmin-award-status--done">
                    Confirmed: <strong>{cat.ceremonyWinner?.name ?? "Unknown"}</strong>
                  </p>
                ) : cat.isTie ? (
                  <p className="voteadmin-award-status voteadmin-award-status--tie">Tie — pick one winner below</p>
                ) : hasVotes ? (
                  <p className="voteadmin-award-status">Top vote-getter</p>
                ) : (
                  <p className="voteadmin-award-status muted">No votes in this category yet</p>
                )}
              </div>

              {hasVotes ? (
                <ul className="voteadmin-leader-list" role="list">
                  {cat.leaders.map((L) => {
                    const id = compoundKey(L.playerId, L.teamId);
                    const checked = sel === id;
                    return (
                      <li key={id} className="voteadmin-leader-row">
                        {cat.isTie && !isConfirmed ? (
                          <label className="voteadmin-leader-label">
                            <input
                              type="radio"
                              name={`award-${cat.key}`}
                              value={id}
                              checked={checked}
                              onChange={() => setSelection((prev) => ({ ...prev, [cat.key]: id }))}
                              disabled={busyKey !== null}
                            />
                            <span className="voteadmin-leader-body">
                              <span className="voteadmin-leader-name">{L.name}</span>
                              <span className="muted small voteadmin-leader-meta">
                                {L.teamName} · {L.count} vote{L.count === 1 ? "" : "s"}
                              </span>
                            </span>
                          </label>
                        ) : (
                          <div className="voteadmin-leader-static">
                            <span className="voteadmin-leader-name">{L.name}</span>
                            <span className="muted small voteadmin-leader-meta">
                              {L.teamName} · {L.count} vote{L.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {!isConfirmed && hasVotes ? (
                <button
                  type="button"
                  className="btn-primary voteadmin-award-confirm"
                  disabled={disableConfirm || !sel}
                  onClick={() => void confirm(cat)}
                >
                  {busyKey === cat.key ? "Saving…" : "Confirm award"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
