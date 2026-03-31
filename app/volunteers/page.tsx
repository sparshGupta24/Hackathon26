"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShowcaseTeamCard } from "@/components/AdminShowcaseTeamCard";
import { CircuitMapModal } from "@/components/CircuitMapModal";
import type { RemoveTeamModalStep } from "@/components/RemoveTeamModal";
import { RemoveTeamModal } from "@/components/RemoveTeamModal";
import type { RadioProgressDelta } from "@/components/VolunteerTeamRadioCard";
import { VolunteerMissionStatementsSection } from "@/components/VolunteerMissionStatementsSection";
import { VolunteerRewardsSection } from "@/components/VolunteerRewardsSection";
import { VolunteerTeamRadioCard } from "@/components/VolunteerTeamRadioCard";
import { TEAM_LIMIT } from "@/lib/constants";
import type { PersonPublic } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

export default function AdminPage() {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [sendingProgressTeamId, setSendingProgressTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [teamMessages, setTeamMessages] = useState<Record<string, string>>({});
  const [removeModal, setRemoveModal] = useState<{
    teamId: string;
    teamName: string;
    step: RemoveTeamModalStep;
  } | null>(null);

  const [roster, setRoster] = useState<PersonPublic[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonPhoto, setNewPersonPhoto] = useState<File | null>(null);
  const [resetTimerBusy, setResetTimerBusy] = useState(false);

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

  async function executeRemoveTeam(teamId: string) {
    setActionMessage(null);
    setDeletingTeamId(teamId);
    try {
      const response = await fetch("/api/admin/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not remove team");
      }
      setTeamMessages((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
      setRemoveModal(null);
      setActionMessage("Team removed.");
      await refresh();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not remove team.");
    } finally {
      setDeletingTeamId(null);
    }
  }

  async function resetRaceTimer() {
    setActionMessage(null);
    setResetTimerBusy(true);
    try {
      const response = await fetch("/api/admin/timer/reset", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not reset race timer");
      }
      setActionMessage("Race timer reset. Arena can run the start lights again.");
      await refresh();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not reset race timer.");
    } finally {
      setResetTimerBusy(false);
    }
  }

  async function adjustTeamProgress(teamId: string, delta: RadioProgressDelta) {
    setActionMessage(null);
    setSendingProgressTeamId(teamId);
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
      setSendingProgressTeamId(null);
    }
  }

  const removeModalOpen = removeModal !== null;
  const modalDeleting = Boolean(removeModal && deletingTeamId === removeModal.teamId);

  return (
    <main className="page-shell admin-portal">
      <header className="hero compact">
        <div>
          <p className="kicker">Volunteer Controls</p>
          <h1>Volunteer Portal</h1>
          <p className="muted">Radio updates, team roster, and crewmate registration.</p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={!data || resetTimerBusy}
            onClick={() => void resetRaceTimer()}
          >
            {resetTimerBusy ? "Resetting…" : "Reset race timer"}
          </button>
          <Link href="/mainmenu" className="btn-secondary">
            Organizer menu
          </Link>
          <CircuitMapModal />
        </div>
      </header>

      {loading && !data ? (
        <p className="panel">Loading dashboard...</p>
      ) : !data ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error ?? "Unable to load event state."}</p>
          <p className="muted small">
            Check that Firebase credentials are set in <code className="admin-code">.env</code> and the dev server can reach Firestore.
          </p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="panel admin-radio-panel">
            <div className="section-head">
              <h2>Radio Message Manager</h2>
              <span className="pill idle">
                {data.teams.length}/{TEAM_LIMIT} teams
              </span>
            </div>
            <p className="muted small">
              Compose a pit-wall message for each team, then nudge progress by −10, 0, +10, or +20. The arena shows the
              latest broadcast with that team highlighted.
            </p>
            {data.teams.length === 0 ? (
              <p className="muted small">No registered teams yet.</p>
            ) : (
              <div className="admin-radio-grid">
                {data.teams.map((team) => (
                  <VolunteerTeamRadioCard
                    key={team.id}
                    team={team}
                    message={teamMessages[team.id] ?? ""}
                    onMessageChange={(value) =>
                      setTeamMessages((prev) => ({
                        ...prev,
                        [team.id]: value
                      }))
                    }
                    onApplyDelta={(delta) => void adjustTeamProgress(team.id, delta)}
                    disabled={
                      sendingProgressTeamId === team.id || modalDeleting || deletingTeamId !== null
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <VolunteerMissionStatementsSection
            teams={data.teams}
            disabled={deletingTeamId !== null || modalDeleting}
            onSaved={refresh}
          />

          <section className="panel admin-showcase-panel">
            <div className="section-head">
              <h2>Registered teams</h2>
              <span className="pill idle">
                {data.teams.length}/{TEAM_LIMIT}
              </span>
            </div>
            <p className="muted small">Overview of every team on the grid. Remove uses a two-step confirmation.</p>
            {data.teams.length === 0 ? (
              <p className="muted small">No teams registered.</p>
            ) : (
              <div className="admin-showcase-grid">
                {data.teams.map((team) => (
                  <AdminShowcaseTeamCard
                    key={team.id}
                    team={team}
                    onRemove={() => setRemoveModal({ teamId: team.id, teamName: team.name, step: 1 })}
                    removeDisabled={deletingTeamId !== null}
                  />
                ))}
              </div>
            )}
          </section>

          <VolunteerRewardsSection teams={data.teams} disabled={deletingTeamId !== null || modalDeleting} />

          <section className="panel admin-crewmate-panel">
            <div className="section-head">
              <h2>Crewmate Registrations</h2>
              <span className="pill idle">{roster.length} in corpus</span>
            </div>
            <p className="muted small">
              Add people with a photo and name. Registration picks only from this list. Photos use Firebase Storage when
              possible; otherwise smaller images may be stored on the Firestore document.
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

            <h3 className="admin-subsection-title">Registered Crew mates</h3>
            {rosterLoading ? (
              <p className="muted small">Loading roster…</p>
            ) : roster.length === 0 ? (
              <p className="muted small">No crew mates yet. Add the first one above.</p>
            ) : (
              <div className="admin-crew-chips">
                {roster.map((person) => (
                  <div key={person.id} className="admin-crew-chip">
                    <button
                      type="button"
                      className="admin-crew-chip-remove"
                      aria-label={`Remove ${person.name}`}
                      title="Remove from roster"
                      onClick={() => void removePersonFromRoster(person.id)}
                      disabled={rosterBusy}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12zM10 11v5M14 11v5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs / data URLs */}
                    <img src={person.photoUrl} alt="" className="admin-crew-chip-photo" width={56} height={56} />
                    <span className="admin-crew-chip-name">{person.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </>
      )}

      {actionMessage ? <p className="feedback">{actionMessage}</p> : null}
      {error && data ? <p className="error-text">{error}</p> : null}

      <RemoveTeamModal
        open={removeModalOpen}
        teamName={removeModal?.teamName ?? ""}
        step={removeModal?.step ?? 1}
        deleting={modalDeleting}
        onCancel={() => !modalDeleting && setRemoveModal(null)}
        onContinue={() => setRemoveModal((m) => (m ? { ...m, step: 2 } : null))}
        onBack={() => setRemoveModal((m) => (m ? { ...m, step: 1 } : null))}
        onConfirm={() => removeModal && void executeRemoveTeam(removeModal.teamId)}
      />
    </main>
  );
}
