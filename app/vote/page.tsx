"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

const STEPS: VoteCategoryId[] = ["gunner", "ripper"];

export default function VotePage() {
  const { data, loading, error } = useEventState(true);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [gunner, setGunner] = useState<Selection>(null);
  const [ripper, setRipper] = useState<Selection>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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
  const categoryId = STEPS[stepIndex]!;
  const categoryMeta = VOTE_CATEGORIES.find((c) => c.id === categoryId)!;
  const selectionForStep = categoryId === "gunner" ? gunner : ripper;

  useEffect(() => {
    setCarouselIndex(0);
    const el = viewportRef.current;
    if (el) {
      el.scrollTo({ left: 0, behavior: "auto" });
    }
  }, [stepIndex]);

  function scrollToSlide(index: number) {
    const el = viewportRef.current;
    if (!el || !choices.length) {
      return;
    }
    const next = Math.max(0, Math.min(index, choices.length - 1));
    setCarouselIndex(next);
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  function onViewportScroll() {
    const el = viewportRef.current;
    if (!el || !choices.length) {
      return;
    }
    const w = el.clientWidth;
    if (w <= 0) {
      return;
    }
    const i = Math.round(el.scrollLeft / w);
    setCarouselIndex(Math.max(0, Math.min(i, choices.length - 1)));
  }

  function selectCurrentForCategory() {
    const c = choices[carouselIndex];
    if (!c) {
      return;
    }
    if (categoryId === "gunner") {
      setGunner({ playerId: c.playerId, teamId: c.teamId });
    } else {
      setRipper({ playerId: c.playerId, teamId: c.teamId });
    }
    setFeedback(null);
  }

  function goNextStep() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((s) => s + 1);
    }
  }

  function goPrevStep() {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  }

  async function submitVotes() {
    if (!voterId || !gunner || !ripper) {
      setFeedback("Complete both categories first.");
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterId,
          gunner: { playerId: gunner.playerId, teamId: gunner.teamId },
          ripper: { playerId: ripper.playerId, teamId: ripper.teamId }
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFeedback(payload.error ?? "Could not submit votes.");
        return;
      }
      if (VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE) {
        setHasVoted(true);
      } else {
        setGunner(null);
        setRipper(null);
        setStepIndex(0);
        setFeedback("Votes recorded. (Testing mode: you can vote again.)");
      }
    } catch {
      setFeedback("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const current = choices[carouselIndex];
  const canPickCurrent = Boolean(current);

  return (
    <main className="page-shell">
      <header className="hero compact">
        <div>
          <p className="kicker">Audience</p>
          <h1>Vote</h1>
          <p className="muted">
            {VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE ? (
              <>
                Choose <strong>Best gunner</strong>, then <strong>Best ripper</strong>. One ballot per device.
              </>
            ) : (
              <>
                Choose <strong>Best gunner</strong>, then <strong>Best ripper</strong>.{" "}
                <span className="vote-testing-badge">Testing: repeat votes allowed</span>
              </>
            )}
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </div>
      </header>

      {loading || !data ? (
        <p className="panel">Loading teams…</p>
      ) : error ? (
        <p className="panel error-text">{error}</p>
      ) : !statusChecked ? (
        <p className="panel">Checking ballot…</p>
      ) : hasVoted && VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE ? (
        <section className="panel vote-thanks">
          <h2>Thanks — your votes are in</h2>
          <p className="muted">This device has already submitted a ballot for both categories.</p>
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
        </section>
      ) : !teams.length ? (
        <p className="panel">No teams registered yet. Check back after registration.</p>
      ) : !choices.length ? (
        <p className="panel">No players on registered teams yet.</p>
      ) : (
        <section className="panel vote-ballot vote-ballot--carousel">
          <div className="vote-stepper" aria-hidden>
            {STEPS.map((id, i) => (
              <span
                key={id}
                className={`vote-stepper-dot${i === stepIndex ? " vote-stepper-dot--active" : ""}${i < stepIndex ? " vote-stepper-dot--done" : ""}`}
              />
            ))}
          </div>
          <p className="vote-step-label muted small">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h2 className="vote-category-heading">{categoryMeta.label}</h2>
          <p className="muted small vote-category-hint">Any team member is eligible. Swipe or use arrows to browse.</p>

          <div className="vote-carousel-shell">
            <button
              type="button"
              className="vote-carousel-arrow vote-carousel-arrow--prev"
              aria-label="Previous candidate"
              disabled={carouselIndex <= 0}
              onClick={() => scrollToSlide(carouselIndex - 1)}
            >
              ‹
            </button>
            <div
              ref={viewportRef}
              className="vote-carousel-viewport"
              onScroll={onViewportScroll}
              role="region"
              aria-roledescription="carousel"
              aria-label={`Candidates for ${categoryMeta.label}`}
            >
              {choices.map((c) => {
                const picked =
                  selectionForStep?.playerId === c.playerId && selectionForStep?.teamId === c.teamId;
                return (
                  <div key={`${c.teamId}-${c.playerId}`} className="vote-carousel-slide">
                    <div className={`vote-carousel-card${picked ? " vote-carousel-card--picked" : ""}`}>
                      {c.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photoUrl}
                          alt=""
                          className="vote-carousel-photo"
                          width={200}
                          height={200}
                        />
                      ) : (
                        <div className="vote-carousel-photo vote-carousel-photo--fallback" aria-hidden>
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <p className="vote-carousel-name">{c.name}</p>
                      <p className="vote-carousel-team muted">{c.teamName}</p>
                      {picked ? <p className="vote-carousel-picked-label">Selected</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="vote-carousel-arrow vote-carousel-arrow--next"
              aria-label="Next candidate"
              disabled={carouselIndex >= choices.length - 1}
              onClick={() => scrollToSlide(carouselIndex + 1)}
            >
              ›
            </button>
          </div>

          <div className="vote-carousel-dots" role="tablist" aria-label="Candidate pages">
            {choices.map((c, i) => (
              <button
                key={`${c.teamId}-${c.playerId}-dot`}
                type="button"
                role="tab"
                aria-selected={i === carouselIndex}
                className={`vote-carousel-dot${i === carouselIndex ? " vote-carousel-dot--active" : ""}`}
                aria-label={`${c.name}, ${c.teamName}`}
                onClick={() => scrollToSlide(i)}
              />
            ))}
          </div>

          <div className="vote-carousel-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={!canPickCurrent}
              onClick={selectCurrentForCategory}
            >
              {current ? `Vote for ${current.name}` : "Pick someone"}
            </button>
            {stepIndex > 0 ? (
              <button type="button" className="btn-link vote-carousel-back" onClick={goPrevStep}>
                ← Back to {VOTE_CATEGORIES[0]!.label}
              </button>
            ) : null}
          </div>

          {selectionForStep && stepIndex < STEPS.length - 1 ? (
            <div className="vote-step-footer">
              <button type="button" className="btn-primary" onClick={goNextStep}>
                Next: {VOTE_CATEGORIES[1]!.label} →
              </button>
            </div>
          ) : null}

          {selectionForStep && stepIndex === STEPS.length - 1 ? (
            <div className="vote-step-footer vote-step-footer--submit">
              <p className="muted small vote-summary">
                <strong>Best gunner:</strong>{" "}
                {choices.find((c) => c.playerId === gunner?.playerId && c.teamId === gunner?.teamId)?.name ?? "—"}
                <br />
                <strong>Best ripper:</strong>{" "}
                {choices.find((c) => c.playerId === ripper?.playerId && c.teamId === ripper?.teamId)?.name ?? "—"}
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting || !gunner || !ripper}
                onClick={() => void submitVotes()}
              >
                {submitting ? "Submitting…" : "Cast votes"}
              </button>
            </div>
          ) : null}

          {feedback ? <p className="feedback">{feedback}</p> : null}
        </section>
      )}
    </main>
  );
}
