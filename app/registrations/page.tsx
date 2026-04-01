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
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  REQUIRED_TEAM_ROLE_COUNT,
  TEAM_LIMIT,
  TEAM_ROLES
} from "@/lib/constants";
import { EventBrandLogos } from "@/components/EventBrandLogos";
import { PROMPT_PERMUTATION_COUNT } from "@/lib/promptPermutations";
import type { PersonPublic } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

interface RegistrationFormState {
  teamName: string;
  /** One roster id per fixed role slot (same order as TEAM_ROLES; optional slot may be ""). */
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
  rolePlayerIds: ["", "", "", "", "", ""],
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
  /** Roster for the team that just registered (for thank-you after prompt step). */
  const [promptStepCrew, setPromptStepCrew] = useState<PersonPublic[]>([]);
  const [postCompleteThanks, setPostCompleteThanks] = useState<{
    teamName: string;
    members: PersonPublic[];
  } | null>(null);

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

  const availablePromptPermutationIndices = useMemo(() => {
    const taken = new Set<number>();
    for (const t of data?.teams ?? []) {
      const idx = t.promptPermutationIndex;
      if (typeof idx === "number" && idx >= 0 && idx < PROMPT_PERMUTATION_COUNT) {
        taken.add(idx);
      }
    }
    return Array.from({ length: PROMPT_PERMUTATION_COUNT }, (_, i) => i).filter((i) => !taken.has(i));
  }, [data?.teams]);

  const roleIdsTrimmed = useMemo(
    () => formState.rolePlayerIds.map((id) => id.trim()),
    [formState.rolePlayerIds]
  );

  const playerIdsForApi = useMemo(
    () => roleIdsTrimmed.filter((id) => id.length > 0),
    [roleIdsTrimmed]
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
    const missingRequired = TEAM_ROLES.filter((role, i) => !role.optional && !roleIdsTrimmed[i]).map(
      (r) => r.title
    );
    if (missingRequired.length > 0) {
      if (missingRequired.length === 1) {
        return `Assign a recruit to the ${missingRequired[0]} role (required).`;
      }
      return `These roles still need a recruit: ${missingRequired.join(", ")}.`;
    }
    if (playerIdsForApi.length < MIN_PLAYERS || playerIdsForApi.length > MAX_PLAYERS) {
      return `Your team must have between ${MIN_PLAYERS} and ${MAX_PLAYERS} members (required roles plus optional Stabiliser #2).`;
    }
    if (new Set(playerIdsForApi).size !== playerIdsForApi.length) {
      return "Each role must be a different person.";
    }
    return null;
  }, [people.length, formState.teamName, roleIdsTrimmed, playerIdsForApi]);

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
          playerIds: playerIdsForApi,
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
  }, [formState.teamName, formState.livery, playerIdsForApi, refresh, validationMessage]);

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
    const crewIdsSnapshot = [...playerIdsForApi];
    const result = await submitTeamRegistration();
    if (result.ok) {
      const crew = crewIdsSnapshot
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is PersonPublic => Boolean(p));
      setPromptStepCrew(crew);
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
    setConfirmOpen(false);
    setDraftOpenSlot(null);
    setPostCompleteThanks({ teamName: pendingTeamName, members: [...promptStepCrew] });
    setStep(1);
    setPendingTeamId(null);
    setPendingTeamName("");
    setPromptStepCrew([]);
    void refresh();
    setFeedback(null);
  }

  function dismissThanks() {
    setConfirmOpen(false);
    setDraftOpenSlot(null);
    setPostCompleteThanks(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
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
              {!postCompleteThanks ? (
                <div className="reg-header-logos">
                  <EventBrandLogos variant="reg" />
                </div>
              ) : null}
              <h1 className="reg-page-title">Team Registration</h1>
              <div className="reg-header-meta">
                <span className={`pill ${registrationClosed ? "ended" : "idle"}`}>Slots left: {spotsLeft}</span>
              </div>
              <div className="reg-stepper" aria-label="Registration progress">
                <span
                  className={`reg-step${postCompleteThanks || step === 2 ? " reg-step--done" : ""}${
                    step === 1 && !postCompleteThanks ? " reg-step--active" : ""
                  }`}
                >
                  1 · Team
                </span>
                <span className="reg-step-sep" aria-hidden>
                  →
                </span>
                <span
                  className={`reg-step${postCompleteThanks ? " reg-step--done" : ""}${
                    step === 2 ? " reg-step--active" : ""
                  }`}
                >
                  2 · Prompt
                </span>
              </div>
            </header>

            {postCompleteThanks ? (
              <div
                className="reg-thanks"
                role="status"
                aria-live="polite"
                aria-label="Registration successful"
              >
                <div className="reg-thanks-logos">
                  <EventBrandLogos variant="reg" className="event-brand-pair--reg-thanks" />
                </div>
                <p className="reg-thanks-message">
                  Thanks for registering <strong>{postCompleteThanks.teamName}</strong>
                </p>
                <ul className="reg-thanks-crew" aria-label="Team members">
                  {postCompleteThanks.members.map((member) => (
                    <li key={member.id} className="reg-thanks-crew-item" aria-label={member.name}>
                      {member.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                        <img
                          src={member.photoUrl}
                          alt=""
                          className="reg-thanks-crew-photo"
                          width={88}
                          height={88}
                        />
                      ) : (
                        <span className="reg-thanks-crew-fallback" aria-hidden>
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="muted small reg-thanks-sub">
                  Your team and challenge prompt are saved. Good luck in the hack.
                </p>
                <button
                  type="button"
                  className="btn-primary reg-thanks-dismiss"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dismissThanks();
                  }}
                >
                  Continue
                </button>
              </div>
            ) : null}

            {step === 2 && pendingTeamId ? (
              <RegistrationPromptStep
                teamId={pendingTeamId}
                teamName={pendingTeamName}
                disabled={registrationClosed}
                availablePermutationIndices={availablePromptPermutationIndices}
                onRefreshState={() => void refresh()}
                onDone={handlePromptStepDone}
              />
            ) : null}

            {step === 1 && !postCompleteThanks ? (
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
                      {REQUIRED_TEAM_ROLE_COUNT} required roles and 1 optional (Stabiliser #2) —{" "}
                      {peopleLoading
                        ? "Loading roster…"
                        : people.length === 0
                          ? "Add players in Volunteer Portal first."
                          : "Tap a card to assign. Drafted players are unavailable."}
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
                            key={`${slotIndex}-${role.title}`}
                            type="button"
                            className={`reg-role-card${role.optional ? " reg-role-card--optional" : ""}`}
                            disabled={pickerDisabled}
                            aria-expanded={draftOpenSlot === slotIndex}
                            aria-haspopup="dialog"
                            aria-label={
                              role.optional
                                ? `${role.title} (optional) — select recruit or leave unassigned`
                                : `${role.title} (required) — select recruit`
                            }
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
                                <span className="reg-role-card-footer-placeholder">
                                  {role.optional ? "Optional — tap to add" : "Select a recruit"}
                                </span>
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
                  allowClear={Boolean(TEAM_ROLES[draftOpenSlot]?.optional)}
                />
              ) : null}
            </form>
            ) : null}

            {feedback && !postCompleteThanks ? <p className="feedback">{feedback}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </>
      )}

      {!loading && data && step === 1 && !postCompleteThanks ? (
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
                    {confirmCrew.map(({ role, person }, idx) => (
                      <div key={`${idx}-${role.title}`} className="reg-confirm-crew-row">
                        {person?.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.photoUrl} alt="" className="reg-confirm-crew-photo" width={40} height={40} />
                        ) : person ? (
                          <span className="reg-confirm-crew-fallback" aria-hidden>
                            {person.name.slice(0, 1).toUpperCase()}
                          </span>
                        ) : role.optional ? (
                          <span className="reg-confirm-crew-fallback reg-confirm-crew-fallback--muted" aria-hidden>
                            —
                          </span>
                        ) : (
                          <span className="reg-confirm-crew-fallback" aria-hidden>
                            ?
                          </span>
                        )}
                        <div className="reg-confirm-crew-meta">
                          <span className="reg-confirm-crew-role">{role.title}</span>
                          <span className="reg-confirm-crew-name">
                            {person?.name ?? (role.optional ? "Optional — not assigned" : "—")}
                          </span>
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
