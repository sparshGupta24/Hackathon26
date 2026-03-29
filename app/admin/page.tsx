"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircuitMapModal } from "@/components/CircuitMapModal";
import { TeamCards } from "@/components/TeamCards";
import { TimerCard } from "@/components/TimerCard";
import { TEAM_LIMIT } from "@/lib/constants";
import type { PersonPublic } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

export default function AdminPage() {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [teamMessages, setTeamMessages] = useState<Record<string, string>>({});

  const [roster, setRoster] = useState<PersonPublic[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonPhoto, setNewPersonPhoto] = useState<File | null>(null);

  const { data, loading, error, refresh } = useEventState(true);

  const loadRoster = useCallback(async () => {
    try {
      const response = await fetch("/api/people", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load roster");
      }
      const payload = (await response.json()) as PersonPublic[];
      setRoster(payload);
    } catch {
      setRoster([]);
    }
  }, []);

  useEffect(() => {
    void loadRoster().finally(() => {
      setRosterLoading(false);
    });
  }, [loadRoster]);

  async function addPersonToRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRosterMessage(null);
    const name = newPersonName.trim();
    if (!name) {
      setRosterMessage("Enter a display name.");
      return;
    }
    if (!newPersonPhoto) {
      setRosterMessage("Choose a photo (PNG, JPEG, or WebP).");
      return;
    }

    setRosterBusy(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("photo", newPersonPhoto);
      const response = await fetch("/api/admin/people", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not add player");
      }
      setNewPersonName("");
      setNewPersonPhoto(null);
      (event.target as HTMLFormElement).reset();
      setRosterMessage("Player added to roster.");
      await loadRoster();
    } catch (err) {
      setRosterMessage(err instanceof Error ? err.message : "Could not add player.");
    } finally {
      setRosterBusy(false);
    }
  }

  async function removePersonFromRoster(id: string) {
    setRosterMessage(null);
    setRosterBusy(true);
    try {
      const response = await fetch("/api/admin/people", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not remove player");
      }
      setRosterMessage("Player removed.");
      await loadRoster();
    } catch (err) {
      setRosterMessage(err instanceof Error ? err.message : "Could not remove player.");
    } finally {
      setRosterBusy(false);
    }
  }

  async function triggerTimer(endpoint: string, body?: Record<string, number>) {
    setActionMessage(null);
    setActionBusy(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Action failed");
      }

      setActionMessage("Timer updated.");
      await refresh();
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "Unable to update timer.");
    } finally {
      setActionBusy(false);
    }
  }

  async function adjustTeamProgress(teamId: string, delta: 1 | -1) {
    setActionMessage(null);
    setActionBusy(true);
    try {
      const customMessage = teamMessages[teamId]?.trim();
      if (!customMessage) {
        throw new Error("Add a message before sending the update.");
      }
      const response = await fetch("/api/admin/team-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, delta, message: customMessage })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update team progress");
      }
      setActionMessage("Team progress updated.");
      await refresh();
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "Unable to update team progress.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="hero compact">
        <div>
          <p className="kicker">Volunteer Controls</p>
          <h1>Race Director Dashboard</h1>
          <p className="muted">Start, extend, and reset the shared event timer while tracking registrations live.</p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn-secondary">
            Public Page
          </Link>
          <CircuitMapModal />
        </div>
      </header>

      {loading || !data ? (
        <p className="panel">Loading dashboard...</p>
      ) : (
        <>
          <TimerCard timer={data.timer} title="Timer Controls">
            <div className="timer-actions">
              <button className="btn-primary" type="button" onClick={() => void triggerTimer("/api/admin/timer/start")}>
                Start Timer
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => void triggerTimer("/api/admin/timer/extend", { minutes: 5 })}
                disabled={actionBusy || data.timer.status !== "running"}
              >
                +5 min
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => void triggerTimer("/api/admin/timer/extend", { minutes: 10 })}
                disabled={actionBusy || data.timer.status !== "running"}
              >
                +10 min
              </button>
              <button className="btn-link" type="button" onClick={() => void triggerTimer("/api/admin/timer/reset")}>
                Reset
              </button>
            </div>
          </TimerCard>

          <section className="panel">
            <div className="section-head">
              <h2>Player roster</h2>
              <span className="pill idle">{roster.length} in corpus</span>
            </div>
            <p className="muted small">
              Add people with a photo and name. Teams on the public page pick only from this list. Photos go to Firebase
              Storage when possible (the app tries both default bucket names). If Storage is unavailable, images under ~720KB
              are stored on the Firestore document instead; the emulator always uses inline storage.
            </p>
            <form className="admin-people-add" onSubmit={(e) => void addPersonToRoster(e)}>
              <label>
                Display name
                <input
                  type="text"
                  maxLength={80}
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  disabled={rosterBusy}
                />
              </label>
              <label>
                Photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setNewPersonPhoto(e.target.files?.[0] ?? null)}
                  disabled={rosterBusy}
                />
              </label>
              <button className="btn-primary" type="submit" disabled={rosterBusy}>
                {rosterBusy ? "Saving…" : "Add to roster"}
              </button>
            </form>
            {rosterMessage ? <p className="feedback small">{rosterMessage}</p> : null}
            {rosterLoading ? (
              <p className="muted small">Loading roster…</p>
            ) : roster.length === 0 ? (
              <p className="muted small">No players yet. Add the first one above.</p>
            ) : (
              <div className="admin-people-list">
                {roster.map((person) => (
                  <div key={person.id} className="admin-people-row">
                    <div className="admin-people-row-info">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs / data URLs */}
                      <img src={person.photoUrl} alt="" className="admin-people-thumb" width={44} height={44} />
                      <span>{person.name}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => void removePersonFromRoster(person.id)}
                      disabled={rosterBusy}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Teams Registered</h2>
              <span className="pill idle">
                {data.teams.length}/{TEAM_LIMIT}
              </span>
            </div>
            <div className="team-progress-admin-list">
              {data.teams.map((team) => (
                <article className="team-progress-admin-item" key={team.id}>
                  <div>
                    <p className="team-progress-admin-name">{team.name}</p>
                    <p className="muted small">Progress: {team.progress}%</p>
                    <input
                      type="text"
                      className="team-progress-msg-input"
                      placeholder="Message to display on arena"
                      value={teamMessages[team.id] ?? ""}
                      onChange={(event) =>
                        setTeamMessages((prev) => ({
                          ...prev,
                          [team.id]: event.target.value
                        }))
                      }
                      maxLength={140}
                      disabled={actionBusy}
                    />
                  </div>
                  <div className="team-progress-admin-actions">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => void adjustTeamProgress(team.id, -1)}
                      disabled={actionBusy}
                    >
                      -1
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => void adjustTeamProgress(team.id, 1)}
                      disabled={actionBusy}
                    >
                      +1
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <TeamCards teams={data.teams} />
          </section>

          {actionMessage ? <p className="feedback">{actionMessage}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </>
      )}
    </main>
  );
}
