"use client";

import { useState } from "react";
import { F1CarPreview } from "@/components/F1CarPreview";
import {
  carSvgPathForTemplateId,
  liveryHexBucketsForTemplate,
  parseCarTemplateId,
  type CarTemplateId
} from "@/lib/carSvgs";
import { registrationDirectionForTeam } from "@/lib/promptPermutations";
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

export function RegulationChangeTeamCard({ team }: { team: TeamState }) {
  const [flipped, setFlipped] = useState(false);
  const { templateId, livery } = liveryFor(team);
  const directionText = registrationDirectionForTeam(team);
  const players = team.players.slice().sort((a, b) => a.slot - b.slot);

  return (
    <div className="regulation-change-slot">
      <div className="team-award-flip-scene regulation-change-flip-scene">
        <div
          className={`team-award-flip-card regulation-change-flip-card ${flipped ? "team-award-flip-card--flipped" : ""}`}
        >
          <button
            type="button"
            className="team-award-flip-face team-award-flip-front team-award-flip-front--clickable regulation-change-front"
            onClick={() => setFlipped(true)}
            disabled={flipped}
            aria-label={`Reveal regulation direction for ${team.name}`}
          >
            <h3 className="regulation-change-team-title">{team.name}</h3>
            <div className="regulation-change-livery" aria-hidden>
              <F1CarPreview
                templatePath={carSvgPathForTemplateId(templateId)}
                hexBuckets={liveryHexBucketsForTemplate(templateId)}
                primaryColor={livery.primaryColor}
                secondaryColor={livery.secondaryColor}
                tertiaryColor={livery.tertiaryColor}
                carNumber={livery.carNumber}
              />
            </div>
            <div className="regulation-change-roster" aria-label="Team members">
              {players.map((player) => (
                <div key={player.id} className="regulation-change-avatar-wrap" title={player.name}>
                  {player.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                    <img
                      src={player.photoUrl}
                      alt=""
                      className="regulation-change-avatar"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span className="regulation-change-avatar regulation-change-avatar--fallback" aria-hidden>
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="regulation-change-hint muted small">Click to reveal</p>
          </button>

          <div className="team-award-flip-face team-award-flip-back regulation-change-back">
            <div className="team-award-back-body regulation-change-back-body">
              <h3 className="regulation-change-exclaim" aria-hidden>
                !
              </h3>
              <h4 className="regulation-change-back-team-name">{team.name}</h4>
              <p className="regulation-change-direction-text">
                {directionText ? (
                  directionText
                ) : (
                  <span className="muted">No registration direction saved for this team yet.</span>
                )}
              </p>
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
