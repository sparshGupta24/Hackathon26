"use client";

import { type FocusEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { F1CarPreview } from "@/components/F1CarPreview";
import { PlayerDraftPopover } from "@/components/PlayerDraftPopover";
import { RegistrationPromptStep } from "@/components/RegistrationPromptStep";
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

export default function RegistrationsPage() {
  const { data, loading, error, refresh } = useEventState(true);
  const [formState, setFormState] = useState<RegistrationFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonPublic[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [draftOpenSlot, setDraftOpenSlot] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showNiceNameChip, setShowNiceNameChip] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [pendingTeamName, setPendingTeamName] = useState("");

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

  const validationMessage = useMemo((): string | null => {
    if (people.length === 0) {
      return "No players are available yet. Ask a volunteer to add people in the volunteer portal.";
    }
    if (!formState.teamName.trim()) {
      return "Enter a team name.";
    }
    if (roleIdsTrimmed.some((id) => !id)) {
      return "Select one roster player for each of the five roles.";
    }
    if (roleIdsTrimmed.length !== MAX_PLAYERS) {
      return "All five roles must be assigned.";
    }
    if (new Set(roleIdsTrimmed).size !== roleIdsTrimmed.length) {
      return "Each role must be a different person.";
    }
    return null;
  }, [people.length, formState.teamName, roleIdsTrimmed]);

  const submitTeamRegistration = useCallback(async (): Promise<{ ok: true; teamId: string } | { ok: false }> => {
    setFeedback(null);
    const msg = validationMessage;
    if (msg) {
      setFeedback(msg);
      return { ok: false };
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/teams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: formState.teamName.trim(),
          playerIds: roleIdsTrimmed,
          livery: formState.livery
        })
      });

      const payload = (await response.json()) as { error?: string; teamId?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Registration failed");
      }
      if (!payload.teamId || typeof payload.teamId !== "string") {
        throw new Error("Registration succeeded but the server did not return a team id.");
      }

      await refresh();
      return { ok: true, teamId: payload.teamId };
    } catch (submitError) {
      setFeedback(submitError instanceof Error ? submitError.message : "Failed to register team.");
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  }, [formState.teamName, formState.livery, refresh, roleIdsTrimmed, validationMessage]);

  function openConfirmModal() {
    setFeedback(null);
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    const name = formState.teamName.trim();
    const result = await submitTeamRegistration();
    if (result.ok) {
      setConfirmOpen(false);
      setFormState(initialForm);
      setShowNiceNameChip(false);
      setPendingTeamId(result.teamId);
      setPendingTeamName(name);
      setStep(2);
      setFeedback(null);
    }
  }

  function handlePromptStepDone() {
    setStep(1);
    setPendingTeamId(null);
    setPendingTeamName("");
    void refresh();
    setFeedback("Registration complete — team and challenge prompt saved.");
  }

  function handleTeamNameBlur(event: FocusEvent<HTMLInputElement>) {
    setShowNiceNameChip(event.currentTarget.value.trim().length > 0);
  }

  function preventFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const confirmCrew = TEAM_ROLES.map((role, slotIndex) => {
    const id = formState.rolePlayerIds[slotIndex]?.trim() ?? "";
    const person = id ? people.find((p) => p.id === id) : undefined;
    return { role, person };
  });

  return (
    <main className="page-shell registration-page">
      {loading && !data ? (
        <p className="panel">Loading event state...</p>
      ) : !data ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error ?? "Unable to load event state."}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="panel">
            <header className="reg-page-header">
              <div className="reg-header-logos" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo from public */}
                <img src="/F1DLOGO.svg" alt="" className="reg-header-logo" width={200} height={56} />
                {/* eslint-disable-next-line @next/next/no-img-element -- PNG logo from public (same as idle) */}
                <img src="/GPLOGO.png" alt="" className="reg-header-logo" width={120} height={56} />
              </div>
              <h1 className="reg-page-title">Team Registration</h1>
              <div className="reg-header-meta">
                <span className={`pill ${registrationClosed ? "ended" : "idle"}`}>Slots left: {spotsLeft}</span>
              </div>
              <div className="reg-stepper" aria-label="Registration progress">
                <span className={`reg-step${step === 1 ? " reg-step--active" : " reg-step--done"}`}>1 · Team</span>
                <span className="reg-step-sep" aria-hidden>
                  →
                </span>
                <span className={`reg-step${step === 2 ? " reg-step--active" : ""}`}>2 · Prompt</span>
              </div>
            </header>

            {step === 2 && pendingTeamId ? (
              <RegistrationPromptStep
                teamId={pendingTeamId}
                teamName={pendingTeamName}
                disabled={registrationClosed}
                onDone={handlePromptStepDone}
              />
            ) : null}

            {step === 1 ? (
            <form className="form-grid reg-form" onSubmit={preventFormSubmit}>
              <div className="reg-form-pods">
                <div className="reg-pod reg-pod--team" role="group" aria-labelledby="reg-pod-team-label">
                  <p id="reg-pod-team-label" className="reg-pod-label">
                    Team & crew
                  </p>

                  <div className="reg-team-name-block">
                    <label>
                      Team name
                      <div className="reg-team-name-row">
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="Enter team name here"
                          value={formState.teamName}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, teamName: event.target.value }))
                          }
                          onBlur={handleTeamNameBlur}
                          required
                          disabled={registrationClosed || submitting}
                          aria-describedby="reg-team-name-hint"
                        />
                        {showNiceNameChip ? (
                          <span className="reg-name-chip" aria-live="polite">
                            <span aria-hidden>👌</span> Nice name
                          </span>
                        ) : null}
                      </div>
                    </label>
                    <p id="reg-team-name-hint" className="muted small reg-team-name-hint">
                      This name appears on the broadcast and voting screens.
                    </p>
                  </div>

                  <div className="reg-pod-roles-section">
                    <p className="reg-pod-sublabel muted small">
                      {MIN_PLAYERS} roles — {peopleLoading ? "Loading roster…" : people.length === 0 ? "Add players in Volunteer Portal first." : "Tap a card to assign. Drafted players are unavailable."}
                    </p>
                    {!peopleLoading && people.length === 0 ? (
                      <p className="muted small">
                        <Link href="/volunteers">Volunteer Portal</Link> → Player roster.
                      </p>
                    ) : null}
                    <div className="reg-role-cards reg-role-cards-masonry">
                      {TEAM_ROLES.map((role, slotIndex) => {
                        const selectedId = formState.rolePlayerIds[slotIndex] ?? "";
                        const selected = selectedId.trim()
                          ? people.find((p) => p.id === selectedId.trim())
                          : undefined;
                        const pickerDisabled = registrationClosed || submitting || people.length === 0;
                        return (
                          <button
                            key={role.title}
                            type="button"
                            className="reg-role-card"
                            disabled={pickerDisabled}
                            aria-expanded={draftOpenSlot === slotIndex}
                            aria-haspopup="dialog"
                            aria-label={`${role.title} — select recruit`}
                            onClick={() => setDraftOpenSlot(slotIndex)}
                          >
                            <div className="reg-role-card-head">
                              <span className="reg-role-card-title">{role.title}</span>
                              <span className="reg-role-card-sub">{role.subtitle}</span>
                              <span className="reg-role-card-title-line" aria-hidden />
                            </div>
                            <div className="reg-role-card-divider" role="presentation" />
                            <div className="reg-role-card-photo-wrap">
                              {selected ? (
                                selected.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                                  <img
                                    src={selected.photoUrl}
                                    alt=""
                                    className="reg-role-card-photo"
                                    width={120}
                                    height={120}
                                  />
                                ) : (
                                  <span className="reg-role-card-photo-fallback" aria-hidden>
                                    {selected.name.slice(0, 1).toUpperCase()}
                                  </span>
                                )
                              ) : (
                                <span className="reg-role-card-photo-placeholder" aria-hidden />
                              )}
                            </div>
                            <div className="reg-role-card-divider" role="presentation" />
                            <div className="reg-role-card-footer">
                              {selected ? (
                                <span className="reg-role-card-name">{selected.name}</span>
                              ) : (
                                <span className="reg-role-card-footer-placeholder">Select a recruit</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="reg-pod reg-pod--livery" role="group" aria-labelledby="reg-pod-livery-label">
                  <p id="reg-pod-livery-label" className="reg-pod-label">
                    Car livery
                  </p>

                  <div className="reg-pod-livery-preview">
                    <F1CarPreview
                      templatePath={carSvgPathForTemplateId(formState.livery.carTemplate)}
                      hexBuckets={liveryHexBucketsForTemplate(formState.livery.carTemplate)}
                      primaryColor={formState.livery.primaryColor}
                      secondaryColor={formState.livery.secondaryColor}
                      tertiaryColor={formState.livery.tertiaryColor}
                      carNumber={formState.livery.carNumber}
                    />
                  </div>

                  <div className="reg-pod-livery-stack">
                    <div className="reg-pod-template-row" role="list">
                      {CAR_TEMPLATE_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          role="listitem"
                          className={`reg-pod-template-btn car-template-option${formState.livery.carTemplate === id ? " car-template-option--selected" : ""}`}
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

                    <div className="reg-pod-color-circles">
                      <label className="reg-color-circle" title="Primary color">
                        <span className="sr-only">Primary livery color</span>
                        <span
                          className="reg-color-circle-swatch"
                          style={{ backgroundColor: formState.livery.primaryColor }}
                          aria-hidden
                        />
                        <input
                          type="color"
                          value={formState.livery.primaryColor}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              livery: { ...prev.livery, primaryColor: event.target.value.toUpperCase() }
                            }))
                          }
                          disabled={registrationClosed || submitting}
                        />
                      </label>
                      <label className="reg-color-circle" title="Secondary color">
                        <span className="sr-only">Secondary livery color</span>
                        <span
                          className="reg-color-circle-swatch"
                          style={{ backgroundColor: formState.livery.secondaryColor }}
                          aria-hidden
                        />
                        <input
                          type="color"
                          value={formState.livery.secondaryColor}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              livery: { ...prev.livery, secondaryColor: event.target.value.toUpperCase() }
                            }))
                          }
                          disabled={registrationClosed || submitting}
                        />
                      </label>
                      <label className="reg-color-circle" title="Tertiary color">
                        <span className="sr-only">Tertiary livery color</span>
                        <span
                          className="reg-color-circle-swatch"
                          style={{ backgroundColor: formState.livery.tertiaryColor }}
                          aria-hidden
                        />
                        <input
                          type="color"
                          value={formState.livery.tertiaryColor}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              livery: { ...prev.livery, tertiaryColor: event.target.value.toUpperCase() }
                            }))
                          }
                          disabled={registrationClosed || submitting}
                        />
                      </label>
                    </div>

                    <label className="reg-pod-car-number">
                      <span className="sr-only">Car number</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={2}
                        placeholder="Car number"
                        value={String(formState.livery.carNumber)}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/\D/g, "").slice(0, 2);
                          const n = raw === "" ? 1 : Math.min(99, Math.max(1, Number(raw)));
                          setFormState((prev) => ({
                            ...prev,
                            livery: { ...prev.livery, carNumber: n }
                          }));
                        }}
                        disabled={registrationClosed || submitting}
                        aria-label="Car number"
                      />
                    </label>
                  </div>
                </div>
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
            </form>
            ) : null}

            {feedback ? <p className="feedback">{feedback}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </>
      )}

      {!loading && data && step === 1 ? (
        <button
          type="button"
          className="reg-fab"
          disabled={registrationClosed || submitting}
          onClick={openConfirmModal}
        >
          {submitting ? "Registering…" : "Complete registration"}
        </button>
      ) : null}

      {confirmOpen && !loading && data && step === 1 ? (
        <div
          className="reg-confirm-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmOpen(false);
            }
          }}
        >
          <div
            className="reg-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reg-confirm-title"
          >
            {feedback && !feedback.includes("successfully") ? (
              <p className="error-text reg-confirm-error">{feedback}</p>
            ) : null}

            <div className="reg-confirm-pods reg-confirm-pods--split">
              <div className="reg-confirm-pods-left">
                <div className="reg-confirm-pod reg-confirm-pod--livery">
                  <p className="reg-confirm-pod-label">Livery</p>
                  <div className="reg-confirm-livery">
                    <F1CarPreview
                      templatePath={carSvgPathForTemplateId(formState.livery.carTemplate)}
                      hexBuckets={liveryHexBucketsForTemplate(formState.livery.carTemplate)}
                      primaryColor={formState.livery.primaryColor}
                      secondaryColor={formState.livery.secondaryColor}
                      tertiaryColor={formState.livery.tertiaryColor}
                      carNumber={formState.livery.carNumber}
                    />
                  </div>
                </div>
                <div className="reg-confirm-pod reg-confirm-pod--crew">
                  <p className="reg-confirm-pod-label">Team members</p>
                  <div className="reg-confirm-crew">
                    {confirmCrew.map(({ role, person }) => (
                      <div key={role.title} className="reg-confirm-crew-row">
                        {person?.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.photoUrl} alt="" className="reg-confirm-crew-photo" width={40} height={40} />
                        ) : person ? (
                          <span className="reg-confirm-crew-fallback" aria-hidden>
                            {person.name.slice(0, 1).toUpperCase()}
                          </span>
                        ) : (
                          <span className="reg-confirm-crew-fallback" aria-hidden>
                            ?
                          </span>
                        )}
                        <div className="reg-confirm-crew-meta">
                          <span className="reg-confirm-crew-role">{role.title}</span>
                          <span className="reg-confirm-crew-name">{person?.name ?? "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="reg-confirm-pod--actions">
                <p id="reg-confirm-title" className="reg-confirm-pod-heading">
                  Confirm registration for <strong>{formState.teamName.trim()}</strong>?
                </p>
                <div className="reg-confirm-actions">
                  <button type="button" className="btn-primary" onClick={() => void handleConfirmSubmit()} disabled={submitting}>
                    {submitting ? "Submitting…" : "Confirm & register"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
