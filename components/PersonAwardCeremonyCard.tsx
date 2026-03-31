"use client";

import { F1CarPreview } from "@/components/F1CarPreview";
import {
  carSvgPathForTemplateId,
  liveryHexBucketsForTemplate,
  parseCarTemplateId,
  type CarTemplateId
} from "@/lib/carSvgs";
import type { LiveryState, PeopleAwardWinnerPresentation, TeamState } from "@/lib/types";

const FALLBACK_LIVERY: LiveryState = {
  carTemplate: "01",
  primaryColor: "#3a3a42",
  secondaryColor: "#1a1a1f",
  tertiaryColor: "#6b6b78",
  carNumber: 0
};

function liveryFor(team: TeamState): { templateId: CarTemplateId; livery: LiveryState } {
  const livery = team.livery ?? FALLBACK_LIVERY;
  return {
    templateId: parseCarTemplateId(livery.carTemplate) ?? "01",
    livery
  };
}

export function PersonAwardCeremonyCard({
  slotId,
  title,
  description,
  winner,
  team,
  showBack,
  isInteractiveFront,
  onRevealClick,
  showNextCta,
  onNext,
  isLastAward,
  isFuture
}: {
  slotId: string;
  title: string;
  description: string;
  winner: PeopleAwardWinnerPresentation | null;
  team: TeamState | null;
  showBack: boolean;
  isInteractiveFront: boolean;
  onRevealClick: () => void;
  showNextCta: boolean;
  onNext: () => void;
  isLastAward: boolean;
  isFuture: boolean;
}) {
  const flipped = showBack;

  return (
    <div
      id={slotId}
      className={`team-award-stack-slot ${isFuture ? "team-award-stack-slot--future" : ""}`}
    >
      <div className="team-award-flip-scene">
        <div className={`team-award-flip-card ${flipped ? "team-award-flip-card--flipped" : ""}`}>
          {isInteractiveFront ? (
            <button
              type="button"
              className="team-award-flip-face team-award-flip-front team-award-flip-front--clickable"
              onClick={onRevealClick}
              aria-label={`Reveal winner for ${title}`}
            >
              <p className="team-award-kicker">Award</p>
              <h2 className="team-award-category-title">{title}</h2>
              <p className="muted small team-award-category-desc">{description}</p>
              <p className="team-award-reveal-hint">Click to reveal</p>
            </button>
          ) : (
            <div className="team-award-flip-face team-award-flip-front">
              <p className="team-award-kicker">Award</p>
              <h2 className="team-award-category-title">{title}</h2>
              <p className="muted small team-award-category-desc">{description}</p>
            </div>
          )}

          <div className="team-award-flip-face team-award-flip-back">
            <div className="team-award-back-body">
              {winner ? (
                <>
                  <p className="team-award-winner-ribbon">Winner</p>
                  <h3 className="team-award-winner-name">{winner.name}</h3>
                  <p className="people-award-team-line muted small">{winner.teamName}</p>
                  <p className="team-award-congrats">
                    Congratulations — outstanding work, and thank you for racing with us at Pixel Prix.
                  </p>
                  <div className="people-award-portrait-wrap">
                    {winner.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                      <img
                        src={winner.photoUrl}
                        alt=""
                        className="people-award-winner-portrait"
                        width={140}
                        height={140}
                      />
                    ) : (
                      <span className="people-award-winner-portrait people-award-winner-portrait--fallback" aria-hidden>
                        {winner.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {team ? (
                    <div className="team-award-winner-livery" aria-hidden>
                      {(() => {
                        const { templateId, livery } = liveryFor(team);
                        return (
                          <F1CarPreview
                            templatePath={carSvgPathForTemplateId(templateId)}
                            hexBuckets={liveryHexBucketsForTemplate(templateId)}
                            primaryColor={livery.primaryColor}
                            secondaryColor={livery.secondaryColor}
                            tertiaryColor={livery.tertiaryColor}
                            carNumber={livery.carNumber}
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="team-award-winner-ribbon">Winner</p>
                  <p className="team-award-no-winner muted">
                    No votes in this category yet, or the leaderboard is still open. Check back after audience voting.
                  </p>
                </>
              )}
            </div>
            {showNextCta ? (
              <div className="team-award-back-footer">
                <button type="button" className="btn-primary" onClick={onNext}>
                  {isLastAward ? "Next" : "Next category"}
                </button>
                <button type="button" className="team-award-next-text" onClick={onNext}>
                  {isLastAward ? "Next →" : "Continue to next award →"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
