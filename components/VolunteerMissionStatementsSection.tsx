"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import type { TeamState } from "@/lib/types";
import { missionStatementTextMax } from "@/lib/schemas";

type Props = {
  teams: TeamState[];
  disabled?: boolean;
  onSaved: () => Promise<void>;
};

export function VolunteerMissionStatementsSection({ teams, disabled = false, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const t of teams) {
        if (next[t.id] === undefined) {
          next[t.id] = t.missionStatement ?? "";
        }
      }
      for (const id of Object.keys(next)) {
        if (!teams.some((t) => t.id === id)) {
          delete next[id];
        }
      }
      return next;
    });
  }, [teams]);

  const syncDraftFromServer = useCallback((team: TeamState) => {
    setDrafts((prev) => ({ ...prev, [team.id]: team.missionStatement ?? "" }));
  }, []);

  async function onSubmit(team: TeamState, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSavingId(team.id);
    try {
      const response = await fetch("/api/admin/team-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          statement: drafts[team.id] ?? ""
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save");
      }
      setMessage(`Saved mission for ${team.name}.`);
      await onSaved();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="panel admin-mission-panel">
      <div className="section-head">
        <h2>Mission statements</h2>
        <span className="pill idle">{teams.length} teams</span>
      </div>
      <p className="muted small">
        Enter each team&apos;s mission in text. Saved data is stored on the team document in Firestore.
      </p>
      {message ? <p className="feedback small admin-mission-feedback">{message}</p> : null}
      {teams.length === 0 ? (
        <p className="muted small">No teams registered yet.</p>
      ) : (
        <div className="admin-mission-grid">
          {teams.map((team) => (
            <form
              key={team.id}
              className="admin-mission-card"
              onSubmit={(e) => void onSubmit(team, e)}
            >
              <div className="admin-mission-card__head">
                <h3 className="admin-mission-team-name">{team.name}</h3>
                <button
                  type="button"
                  className="btn-link admin-mission-sync"
                  disabled={disabled || savingId === team.id}
                  onClick={() => syncDraftFromServer(team)}
                >
                  Reset to saved
                </button>
              </div>
              <label className="admin-mission-label">
                Mission statement
                <textarea
                  rows={5}
                  maxLength={missionStatementTextMax}
                  value={drafts[team.id] ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [team.id]: e.target.value
                    }))
                  }
                  placeholder="What this team is building toward…"
                  disabled={disabled || savingId === team.id}
                />
              </label>
              <p className="muted small admin-mission-charcount">
                {(drafts[team.id] ?? "").length}/{missionStatementTextMax}
              </p>
              <button
                type="submit"
                className="btn-primary admin-mission-save"
                disabled={disabled || savingId === team.id}
              >
                {savingId === team.id ? "Saving…" : "Save mission"}
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
