"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CircuitMapModal } from "@/components/CircuitMapModal";
import { TeamCards } from "@/components/TeamCards";
import { TimerCard } from "@/components/TimerCard";
import { TEAM_LIMIT } from "@/lib/constants";
import { useEventState } from "@/lib/useEventState";

export default function AdminPage() {
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [passcode, setPasscode] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [teamMessages, setTeamMessages] = useState<Record<string, string>>({});

  const { data, loading, error, refresh } = useEventState(authState === "authenticated", 2000);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const payload = (await response.json()) as { authenticated: boolean };
        setAuthState(payload.authenticated ? "authenticated" : "unauthenticated");
      } catch {
        setAuthState("unauthenticated");
      }
    }

    void checkSession();
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setActionBusy(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed");
      }

      setAuthState("authenticated");
      setPasscode("");
      setActionMessage("Volunteer access granted.");
      await refresh();
    } catch (loginError) {
      setActionMessage(loginError instanceof Error ? loginError.message : "Unable to login.");
    } finally {
      setActionBusy(false);
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
        if (response.status === 401) {
          setAuthState("unauthenticated");
          throw new Error("Session expired. Login again.");
        }
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
        if (response.status === 401) {
          setAuthState("unauthenticated");
          throw new Error("Session expired. Login again.");
        }
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

  if (authState === "checking") {
    return <main className="page-shell"><p className="panel">Checking volunteer session...</p></main>;
  }

  if (authState === "unauthenticated") {
    return (
      <main className="page-shell">
        <section className="panel auth-panel">
          <p className="kicker">Volunteer Console</p>
          <h1>Enter Passcode</h1>
          <form onSubmit={submitLogin} className="form-grid">
            <label>
              Shared Passcode
              <input
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="Enter passcode"
                required
              />
            </label>
            <button className="btn-primary" type="submit" disabled={actionBusy}>
              {actionBusy ? "Authenticating..." : "Unlock Dashboard"}
            </button>
          </form>
          {actionMessage ? <p className="feedback">{actionMessage}</p> : null}
        </section>
      </main>
    );
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
