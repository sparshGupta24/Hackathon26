"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ColorHsbPicker } from "@/components/ColorHsbPicker";
import { CircuitMapModal } from "@/components/CircuitMapModal";
import { F1CarPreview } from "@/components/F1CarPreview";
import { PlayerDraftPopover } from "@/components/PlayerDraftPopover";
import { TeamCards } from "@/components/TeamCards";
import {
  CAR_TEMPLATE_IDS,
  type CarTemplateId,
  carSvgPathForTemplateId,
  liveryHexBucketsForTemplate
} from "@/lib/carSvgs";
import { MAX_PLAYERS, MIN_PLAYERS, TEAM_LIMIT, TEAM_ROLES } from "@/lib/constants";
import type { PersonPublic } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

interface RegistrationFormState {
  teamName: string;
  /** One roster id per fixed role slot (Gunners → Lollipop Man), same order as TEAM_ROLES */
  rolePlayerIds: string[];
  livery: {
    carTemplate: CarTemplateId;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    carNumber: number;
  };
}

const initialForm: RegistrationFormState = {
  teamName: "",
  rolePlayerIds: ["", "", "", "", ""],
  livery: {
    carTemplate: "01",
    primaryColor: "#D62828",
    secondaryColor: "#1D3557",
    tertiaryColor: "#8D99AE",
    carNumber: 7
  }
};

export default function HomePage() {
  const { data, loading, error, refresh } = useEventState(true);
  const [formState, setFormState] = useState<RegistrationFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonPublic[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [draftOpenSlot, setDraftOpenSlot] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/people", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load player list");
        }
        const payload = (await response.json()) as PersonPublic[];
        if (!cancelled) {
          setPeople(payload);
        }
      } catch {
        if (!cancelled) {
          setPeople([]);
        }
      } finally {
        if (!cancelled) {
          setPeopleLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const registeredTeams = data?.teams.length ?? 0;
  const spotsLeft = Math.max(0, TEAM_LIMIT - registeredTeams);
  const registrationClosed = spotsLeft === 0;

  const roleIdsTrimmed = useMemo(
    () => formState.rolePlayerIds.map((id) => id.trim()),
    [formState.rolePlayerIds]
  );

  /** People already assigned to any registered team cannot be picked again. */
  const draftedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of data?.teams ?? []) {
      for (const pl of team.players) {
        if (pl.id) {
          ids.add(pl.id);
        }
      }
    }
    return ids;
  }, [data?.teams]);

  function blockedByOtherRoles(slotIndex: number): Set<string> {
    const s = new Set<string>();
    formState.rolePlayerIds.forEach((id, i) => {
      const t = id.trim();
      if (t && i !== slotIndex) {
        s.add(t);
      }
    });
    return s;
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (people.length === 0) {
      setFeedback("No players are available yet. Ask a volunteer to add people in the volunteer console.");
      return;
    }

    if (roleIdsTrimmed.some((id) => !id)) {
      setFeedback("Select one roster player for each of the five roles.");
      return;
    }

    if (roleIdsTrimmed.length !== MAX_PLAYERS) {
      setFeedback("All five roles must be assigned.");
      return;
    }

    if (new Set(roleIdsTrimmed).size !== roleIdsTrimmed.length) {
      setFeedback("Each role must be a different person.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/teams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: formState.teamName,
          playerIds: roleIdsTrimmed,
          livery: formState.livery
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Registration failed");
      }

      setFormState(initialForm);
      setFeedback("Team registered successfully.");
      await refresh();
    } catch (submitError) {
      setFeedback(submitError instanceof Error ? submitError.message : "Failed to register team.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="kicker">Trackside Ops</p>
          <h1>F1 Team Onboarding Arena</h1>
          <p className="muted">Register teams first, customize livery, then continue to the race timer screen.</p>
        </div>
        <div className="hero-actions">
          <Link href="/vote" className="btn-primary">
            Audience vote
          </Link>
          <Link href="/votingresults" className="btn-secondary">
            Voting results
          </Link>
          <Link href="/admin" className="btn-secondary">
            Volunteer Console
          </Link>
          <Link href="/prompt-generator" className="btn-secondary">
            Prompt Generator
          </Link>
          <Link href="/idle" className="btn-secondary">
            Idle display
          </Link>
          <CircuitMapModal />
        </div>
      </header>

      {loading || !data ? (
        <p className="panel">Loading event state...</p>
      ) : (
        <>
          <section className="panel">
            <div className="section-head">
              <h2>Team Registration (Start Here)</h2>
              <span className={`pill ${registrationClosed ? "ended" : "idle"}`}>Slots left: {spotsLeft}</span>
            </div>

            <form className="form-grid" onSubmit={submitRegistration}>
              <label>
                Team Name
                <input
                  type="text"
                  maxLength={60}
                  value={formState.teamName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, teamName: event.target.value }))}
                  required
                  disabled={registrationClosed || submitting}
                />
              </label>

              <fieldset>
                <legend>Team roles ({MIN_PLAYERS} positions)</legend>
                {peopleLoading ? (
                  <p className="muted small">Loading player roster…</p>
                ) : people.length === 0 ? (
                  <p className="muted small">
                    No players in the roster yet. Volunteers can add names and photos under{" "}
                    <Link href="/admin">Volunteer Console</Link> → Player roster.
                  </p>
                ) : (
                  <p className="muted small">
                    Open the picker for each role. Players already on a team are marked Drafted and cannot be chosen
                    again.
                  </p>
                )}
                <div className="role-player-fields">
                  {TEAM_ROLES.map((role, slotIndex) => {
                    const selectedId = formState.rolePlayerIds[slotIndex] ?? "";
                    const selected = selectedId.trim() ? people.find((p) => p.id === selectedId.trim()) : undefined;
                    const pickerDisabled = registrationClosed || submitting || people.length === 0;
                    return (
                      <div key={role.title} className="role-player-field">
                        <div className="role-player-heading">
                          <span className="role-player-title">{role.title}</span>
                          <span className="role-player-subtitle muted small">{role.subtitle}</span>
                        </div>
                        <div className="role-player-row">
                          <button
                            type="button"
                            className="role-player-picker-btn"
                            disabled={pickerDisabled}
                            aria-expanded={draftOpenSlot === slotIndex}
                            aria-haspopup="dialog"
                            aria-label={`${role.title} — choose player`}
                            onClick={() => setDraftOpenSlot(slotIndex)}
                          >
                            <span className="role-player-picker-label">
                              {selected ? (
                                <span className="role-player-picker-name">{selected.name}</span>
                              ) : (
                                <span className="role-player-picker-placeholder">Choose player…</span>
                              )}
                            </span>
                            {selected?.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                              <img src={selected.photoUrl} alt="" className="role-player-thumb" width={44} height={44} />
                            ) : selected ? (
                              <span className="role-player-thumb role-player-thumb-fallback" aria-hidden>
                                {selected.name.slice(0, 1).toUpperCase()}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {draftOpenSlot !== null && people.length > 0 ? (
                  <PlayerDraftPopover
                    open
                    roleTitle={TEAM_ROLES[draftOpenSlot]!.title}
                    roleSubtitle={TEAM_ROLES[draftOpenSlot]!.subtitle}
                    people={people}
                    draftedIds={draftedPlayerIds}
                    blockedByOtherRoles={blockedByOtherRoles(draftOpenSlot)}
                    currentSelectionId={formState.rolePlayerIds[draftOpenSlot] ?? ""}
                    onClose={() => setDraftOpenSlot(null)}
                    onSelect={(personId) => {
                      setFormState((prev) => {
                        const next = [...prev.rolePlayerIds];
                        next[draftOpenSlot] = personId;
                        return { ...prev, rolePlayerIds: next };
                      });
                    }}
                    triggerDisabled={registrationClosed || submitting}
                  />
                ) : null}
              </fieldset>

              <fieldset>
                <legend>F1 Livery Customization</legend>
                <div className="livery-layout">
                  <div className="livery-preview">
                    <F1CarPreview
                      templatePath={carSvgPathForTemplateId(formState.livery.carTemplate)}
                      hexBuckets={liveryHexBucketsForTemplate(formState.livery.carTemplate)}
                      primaryColor={formState.livery.primaryColor}
                      secondaryColor={formState.livery.secondaryColor}
                      tertiaryColor={formState.livery.tertiaryColor}
                      carNumber={formState.livery.carNumber}
                    />
                  </div>

                  <div className="livery-grid">
                    <div className="car-template-picker">
                      <span className="car-template-picker-label">Car template</span>
                      <div className="car-template-options" role="list">
                        {CAR_TEMPLATE_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            role="listitem"
                            className={`car-template-option${formState.livery.carTemplate === id ? " car-template-option--selected" : ""}`}
                            onClick={() =>
                              setFormState((prev) => ({
                                ...prev,
                                livery: { ...prev.livery, carTemplate: id }
                              }))
                            }
                            disabled={registrationClosed || submitting}
                            aria-pressed={formState.livery.carTemplate === id}
                            aria-label={`Car template ${id}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- small static public SVG */}
                            <img src={carSvgPathForTemplateId(id)} alt="" />
                            <span className="car-template-option-id">{id}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <ColorHsbPicker
                      label="Primary"
                      value={formState.livery.primaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          livery: {
                            ...prev.livery,
                            primaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <ColorHsbPicker
                      label="Secondary"
                      value={formState.livery.secondaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          livery: {
                            ...prev.livery,
                            secondaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <ColorHsbPicker
                      label="Tertiary"
                      value={formState.livery.tertiaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          livery: {
                            ...prev.livery,
                            tertiaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <label>
                      Car Number
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={formState.livery.carNumber}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            livery: {
                              ...prev.livery,
                              carNumber: Number(event.target.value)
                            }
                          }))
                        }
                        disabled={registrationClosed || submitting}
                      />
                    </label>
                  </div>
                </div>
              </fieldset>

              <button className="btn-primary" type="submit" disabled={registrationClosed || submitting}>
                {submitting ? "Registering..." : "Complete Registration"}
              </button>
            </form>

            {feedback ? <p className="feedback">{feedback}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Registered Teams ({registeredTeams}/{TEAM_LIMIT})</h2>
            </div>
            <TeamCards teams={data.teams} />
          </section>

          <section className="panel flow-next">
            <p className="muted">When all teams are ready, continue to the race screen.</p>
            <Link href="/arena" className="btn-primary">
              Go To Race Screen
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
