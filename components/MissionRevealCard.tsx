"use client";

import { useState } from "react";
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

export function MissionRevealCard({ team }: { team: TeamState }) {
  const [flipped, setFlipped] = useState(false);
  const { templateId, livery } = liveryFor(team);
  const promptText = team.challengePrompt?.trim();
  const missionText = team.missionStatement?.trim();

  return (
    <div className="mission-reveal-slot">
      <div className="team-award-flip-scene mission-reveal-flip-scene">
        <div
          className={`team-award-flip-card mission-reveal-flip-card ${flipped ? "team-award-flip-card--flipped" : ""}`}
        >
          <button
            type="button"
            className="team-award-flip-face team-award-flip-front team-award-flip-front--clickable mission-reveal-front"
            onClick={() => setFlipped(true)}
            disabled={flipped}
            aria-label={`Reveal prompt and mission for ${team.name}`}
          >
            <p className="team-award-kicker">Team</p>
            <h2 className="team-award-category-title mission-reveal-team-title">{team.name}</h2>
            <div className="mission-reveal-roster-strip">
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
                          className="team-award-roster-avatar mission-reveal-roster-avatar"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <span
                          className="team-award-roster-avatar team-award-roster-fallback mission-reveal-roster-avatar"
                          aria-hidden
                        >
                          {player.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div className="team-award-winner-livery mission-reveal-livery" aria-hidden>
              <F1CarPreview
                templatePath={carSvgPathForTemplateId(templateId)}
                hexBuckets={liveryHexBucketsForTemplate(templateId)}
                primaryColor={livery.primaryColor}
                secondaryColor={livery.secondaryColor}
                tertiaryColor={livery.tertiaryColor}
                carNumber={livery.carNumber}
              />
            </div>
            <p className="team-award-reveal-hint">Click to reveal prompt &amp; mission</p>
          </button>

          <div className="team-award-flip-face team-award-flip-back mission-reveal-back">
            <div className="team-award-back-body mission-reveal-back-body">
              <section className="mission-reveal-section">
                <h3 className="mission-reveal-section-title">Challenge prompt</h3>
                <p className="mission-reveal-section-text">
                  {promptText ? (
                    <>&ldquo;{promptText}&rdquo;</>
                  ) : (
                    <span className="muted">No challenge prompt set for this team yet.</span>
                  )}
                </p>
              </section>
              <section className="mission-reveal-section">
                <h3 className="mission-reveal-section-title">Mission statement</h3>
                <p className="mission-reveal-section-text">
                  {missionText ? (
                    missionText
                  ) : (
                    <span className="muted">No mission statement yet — add one from the volunteer portal.</span>
                  )}
                </p>
              </section>
            </div>
            <div className="team-award-back-footer">
              <button type="button" className="btn-secondary" onClick={() => setFlipped(false)}>
                Back to team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
