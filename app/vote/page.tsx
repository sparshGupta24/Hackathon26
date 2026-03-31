"use client";

import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { pickBrightestLiveryAccent } from "@/lib/liveryAccentColor";
import { VOTE_CATEGORIES, type VoteCategoryId } from "@/lib/voteCategories";
import { VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE } from "@/lib/voteConfig";
import type { TeamState } from "@/lib/types";
import { useEventState } from "@/lib/useEventState";

type Candidate = {
  playerId: string;
  teamId: string;
  name: string;
  photoUrl?: string;
  teamName: string;
};

type Selection = { playerId: string; teamId: string } | null;

function emptySelections(): Record<VoteCategoryId, Selection> {
  return Object.fromEntries(VOTE_CATEGORIES.map((c) => [c.id, null])) as Record<VoteCategoryId, Selection>;
}

function allCategoriesFilled(s: Record<VoteCategoryId, Selection>): boolean {
  return VOTE_CATEGORIES.every((c) => s[c.id] != null);
}

function allTeamCandidates(teams: TeamState[]): Candidate[] {
  return teams.flatMap((team) =>
    team.players.map((p) => ({
      playerId: p.id,
      teamId: team.id,
      name: p.name,
      photoUrl: p.photoUrl,
      teamName: team.name
    }))
  );
}

const DEFAULT_TEAM_SECONDARY = "#3a3a48";

type TeamPlayerGroup = {
  teamId: string;
  teamName: string;
  primaryColor: string;
  secondaryColor: string;
  players: Candidate[];
};

function playersByTeam(teams: TeamState[]): TeamPlayerGroup[] {
  return teams
    .filter((t) => t.players.length > 0)
    .map((team) => {
      const livery = team.livery;
      const primaryColor = pickBrightestLiveryAccent(livery);
      const secondaryColor =
        livery?.secondaryColor?.trim() ||
        livery?.tertiaryColor?.trim() ||
        livery?.primaryColor?.trim() ||
        DEFAULT_TEAM_SECONDARY;
      return {
        teamId: team.id,
        teamName: team.name,
        primaryColor,
        secondaryColor,
        players: team.players.map((p) => ({
          playerId: p.id,
          teamId: team.id,
          name: p.name,
          photoUrl: p.photoUrl,
          teamName: team.name
        }))
      };
    });
}

function candidateKey(c: Candidate): string {
  return `${c.teamId}-${c.playerId}`;
}

function isSameSelection(a: Selection, c: Candidate): boolean {
  return Boolean(a && a.playerId === c.playerId && a.teamId === c.teamId);
}

const STEPS: VoteCategoryId[] = VOTE_CATEGORIES.map((c) => c.id);

export default function VotePage() {
  const { data, loading, error, refresh } = useEventState(true);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<VoteCategoryId, Selection>>(emptySelections);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const modalTitleId = useId();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let id = window.localStorage.getItem("vote-voter-id");
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem("vote-voter-id", id);
    }
    setVoterId(id);
  }, []);

  const checkStatus = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/votes/status?voterId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!r.ok) {
        return;
      }
      const j = (await r.json()) as { hasVoted?: boolean };
      setHasVoted(Boolean(j.hasVoted));
    } finally {
      setStatusChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!voterId) {
      return;
    }
    if (!VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
      setStatusChecked(true);
      setHasVoted(false);
      return;
    }
    void checkStatus(voterId);
  }, [voterId, checkStatus]);

  const teams = data?.teams ?? [];
  const choices = useMemo(() => allTeamCandidates(teams), [teams]);
  const teamsWithPlayers = useMemo(() => playersByTeam(teams), [teams]);
  const categoryId = STEPS[stepIndex]!;
  const categoryMeta = VOTE_CATEGORIES.find((c) => c.id === categoryId)!;
  const selectionForStep = selections[categoryId];
  const isLastStep = stepIndex === STEPS.length - 1;

  const isBallotView = Boolean(
    data &&
      !error &&
      statusChecked &&
      !(hasVoted && VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) &&
      teams.length > 0 &&
      choices.length > 0
  );

  useEffect(() => {
    if (!reviewOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReviewOpen(false);
        setFeedback(null);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [reviewOpen]);

  function selectCandidate(c: Candidate) {
    setSelections((prev) => ({
      ...prev,
      [categoryId]: { playerId: c.playerId, teamId: c.teamId }
    }));
    setFeedback(null);
  }

  function goNextStep() {
    if (!selectionForStep || stepIndex >= STEPS.length - 1) {
      return;
    }
    setStepIndex((s) => s + 1);
  }

  function goPrevStep() {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  }

  function openReview() {
    if (!selectionForStep || !allCategoriesFilled(selections)) {
      return;
    }
    setFeedback(null);
    setReviewOpen(true);
  }

  async function submitVotes() {
    if (!voterId || !allCategoriesFilled(selections)) {
      setFeedback(`Pick someone for all ${VOTE_CATEGORIES.length} categories first.`);
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const votes = Object.fromEntries(
      VOTE_CATEGORIES.map((c) => {
        const s = selections[c.id]!;
        return [c.id, { playerId: s.playerId, teamId: s.teamId }];
      })
    ) as Record<VoteCategoryId, { playerId: string; teamId: string }>;

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, votes })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFeedback(payload.error ?? "Could not submit votes.");
        return;
      }
      setReviewOpen(false);
      if (VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
        setHasVoted(true);
      } else {
        setSelections(emptySelections());
        setStepIndex(0);
        setFeedback("Votes recorded. (Testing mode: you can vote again.)");
      }
    } catch {
      setFeedback("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function candidateNameForSelection(sel: Selection): string {
    if (!sel) {
      return "—";
    }
    return choices.find((c) => c.playerId === sel.playerId && c.teamId === sel.teamId)?.name ?? "—";
  }

  return (
    <main className={isBallotView ? "vote-page" : "page-shell"}>
      <header className={isBallotView ? "vote-page-header hero compact" : "hero compact"}>
        <div>
          <p className="kicker">Audience</p>
          <h1>Vote</h1>
          <p className="muted">
            {VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE ? (
              <>
                Nominate <strong>one person per category</strong> from every team.{" "}
                {VOTE_CATEGORIES.length} categories — one ballot per device.
              </>
            ) : (
              <>
                Nominate <strong>one person per category</strong> from every team.{" "}
                <span className="vote-testing-badge">Testing: repeat votes allowed</span>
              </>
            )}
          </p>
        </div>
      </header>

      {loading && !data ? (
        <p className="panel">Loading teams…</p>
      ) : !data ? (
        <div className="panel admin-state-fallback">
          <p className="error-text">{error ?? "Unable to load event state."}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : error ? (
        <p className="panel error-text">{error}</p>
      ) : !statusChecked ? (
        <p className="panel">Checking ballot…</p>
      ) : hasVoted && VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE ? (
        <section className="panel vote-thanks">
          <h2>Thanks — your votes are in</h2>
          <p className="muted">This device has already submitted a ballot for all categories.</p>
          <Link href="/home" className="btn-primary">
            Back to home
          </Link>
        </section>
      ) : !teams.length ? (
        <p className="panel">No teams registered yet. Check back after registration.</p>
      ) : !choices.length ? (
        <p className="panel">No players on registered teams yet.</p>
      ) : (
        <>
          <section className="vote-ballot vote-ballot--fullwidth" aria-busy={submitting}>
            <div className="vote-ballot-top">
              <div className="vote-stepper vote-stepper--many" aria-hidden>
                {STEPS.map((id, i) => (
                  <span
                    key={id}
                    className={`vote-stepper-dot${i === stepIndex ? " vote-stepper-dot--active" : ""}${i < stepIndex ? " vote-stepper-dot--done" : ""}`}
                  />
                ))}
              </div>
              <p className="vote-step-label muted small">
                Category {stepIndex + 1} of {STEPS.length}
              </p>
              <h2 className="vote-category-heading vote-category-heading--full">{categoryMeta.label}</h2>
              <p className="muted small vote-category-desc vote-category-desc--full">{categoryMeta.description}</p>
            </div>

            <div
              className="vote-ballot-corpus"
              role="listbox"
              aria-label={`Nominees for ${categoryMeta.label}`}
              aria-activedescendant={
                selectionForStep
                  ? `vote-cand-${categoryId}-${selectionForStep.teamId}-${selectionForStep.playerId}`
                  : undefined
              }
            >
              <div className="vote-teams-stack">
                {teamsWithPlayers.map((group) => (
                  <section
                    key={group.teamId}
                    className="vote-team-card"
                    aria-label={group.teamName}
                    style={
                      {
                        "--team-primary": group.primaryColor,
                        "--team-secondary": group.secondaryColor
                      } as CSSProperties
                    }
                  >
                    <h3 className="vote-team-card-title">{group.teamName}</h3>
                    <div className="vote-team-chips">
                      {group.players.map((c) => {
                        const selected = isSameSelection(selectionForStep, c);
                        return (
                          <button
                            key={candidateKey(c)}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            id={`vote-cand-${categoryId}-${c.teamId}-${c.playerId}`}
                            className={`vote-player-chip${selected ? " vote-player-chip--selected" : ""}`}
                            onClick={() => selectCandidate(c)}
                          >
                            {c.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                              <img
                                src={c.photoUrl}
                                alt=""
                                className="vote-player-chip-avatar"
                                width={28}
                                height={28}
                              />
                            ) : (
                              <span className="vote-player-chip-avatar vote-player-chip-avatar--fallback" aria-hidden>
                                {c.name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span className="vote-player-chip-name">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="vote-grid-actions vote-grid-actions--full">
              {stepIndex > 0 ? (
                <button type="button" className="btn-secondary vote-grid-back" onClick={goPrevStep}>
                  Back
                </button>
              ) : (
                <span className="vote-grid-back-spacer" aria-hidden />
              )}

              {!isLastStep ? (
                <button
                  type="button"
                  className="btn-primary vote-grid-continue"
                  disabled={!selectionForStep}
                  onClick={goNextStep}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary vote-grid-continue"
                  disabled={!selectionForStep || !allCategoriesFilled(selections)}
                  onClick={openReview}
                >
                  Next
                </button>
              )}
            </div>

            {!reviewOpen && feedback && !VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE ? (
              <p className="feedback vote-grid-feedback">{feedback}</p>
            ) : null}
          </section>

          {reviewOpen ? (
            <div
              className="vote-review-modal"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setReviewOpen(false);
                  setFeedback(null);
                }
              }}
            >
              <div
                className="vote-review-modal-panel panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
              >
                <h2 id={modalTitleId} className="vote-review-modal-title">
                  Confirm your ballot
                </h2>
                <p className="muted small vote-review-modal-lead">
                  You are about to submit one nominee per category. Double-check each line, then cast your ballot.
                </p>

                <ul className="vote-review-list">
                  {VOTE_CATEGORIES.map((cat) => {
                    const sel = selections[cat.id];
                    return (
                      <li key={cat.id} className="vote-review-row">
                        <div className="vote-review-row-head">
                          <span className="vote-review-cat">{cat.label}</span>
                          <span className="vote-review-name">{candidateNameForSelection(sel)}</span>
                        </div>
                        <p className="muted small vote-review-desc">{cat.description}</p>
                      </li>
                    );
                  })}
                </ul>

                {feedback ? <p className="feedback vote-review-feedback">{feedback}</p> : null}

                <div className="vote-review-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={submitting}
                    onClick={() => {
                      setReviewOpen(false);
                      setFeedback(null);
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submitting || !allCategoriesFilled(selections)}
                    onClick={() => void submitVotes()}
                  >
                    {submitting ? "Submitting…" : "Cast ballot"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
