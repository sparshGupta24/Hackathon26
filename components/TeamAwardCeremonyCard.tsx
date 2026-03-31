"use client";

import { F1CarPreview } from "@/components/F1CarPreview";
import {
  carSvgPathForTemplateId,
  liveryHexBucketsForTemplate,
  parseCarTemplateId,
  type CarTemplateId
} from "@/lib/carSvgs";
import type { LiveryState, TeamState } from "@/lib/types";

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

export function TeamAwardCeremonyCard({
  slotId,
  title,
  description,
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
              {team ? (
                <>
                  <p className="team-award-winner-ribbon">Winner</p>
                  <h3 className="team-award-winner-name">{team.name}</h3>
                  <p className="team-award-congrats">
                    Congratulations — outstanding work, and thank you for racing with us at Pixel Prix.
                  </p>
                  <div className="team-award-roster-row" aria-label="Team members">
                    {team.players
                      .slice()
                      .sort((a, b) => a.slot - b.slot)
                      .map((player) => (
                        <div key={player.id} className="team-award-roster-avatar-wrap" title={player.name}>
                          {player.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                            <img
                              src={player.photoUrl}
                              alt=""
                              className="team-award-roster-avatar"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <span className="team-award-roster-avatar team-award-roster-fallback" aria-hidden>
                              {player.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
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
                </>
              ) : (
                <>
                  <p className="team-award-winner-ribbon">Winner</p>
                  <p className="team-award-no-winner muted">
                    No team has been selected for this award yet. Ask a volunteer to assign winners in the portal.
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
