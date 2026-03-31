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

export type RadioProgressDelta = -10 | 0 | 10 | 20;

const DELTA_BUTTONS: { delta: RadioProgressDelta; label: string }[] = [
  { delta: -10, label: "−10" },
  { delta: 0, label: "0" },
  { delta: 10, label: "+10" },
  { delta: 20, label: "+20" }
];

function liveryFor(team: TeamState): { templateId: CarTemplateId; livery: LiveryState } {
  const livery = team.livery ?? FALLBACK_LIVERY;
  return {
    templateId: parseCarTemplateId(livery.carTemplate) ?? "01",
    livery
  };
}

export interface VolunteerTeamRadioCardProps {
  team: TeamState;
  message: string;
  onMessageChange: (value: string) => void;
  onApplyDelta: (delta: RadioProgressDelta) => void;
  disabled: boolean;
}

export function VolunteerTeamRadioCard({
  team,
  message,
  onMessageChange,
  onApplyDelta,
  disabled
}: VolunteerTeamRadioCardProps) {
  const { templateId, livery } = liveryFor(team);

  return (
    <article className="admin-radio-card">
      <div className="admin-radio-card-top">
        <div className="admin-radio-card-livery" aria-hidden>
          <F1CarPreview
            templatePath={carSvgPathForTemplateId(templateId)}
            hexBuckets={liveryHexBucketsForTemplate(templateId)}
            primaryColor={livery.primaryColor}
            secondaryColor={livery.secondaryColor}
            tertiaryColor={livery.tertiaryColor}
            carNumber={livery.carNumber}
          />
        </div>
        <div className="admin-radio-card-meta">
          <h3 className="admin-radio-card-name">{team.name}</h3>
          <p className="admin-radio-card-progress muted small">Progress: {team.progress}%</p>
          <div className="admin-radio-card-faces" aria-label="Team members">
            {team.players.map((player) => (
              <div key={player.id} className="admin-radio-card-face-wrap">
                {player.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- roster URLs
                  <img src={player.photoUrl} alt="" className="admin-radio-card-face" width={40} height={40} />
                ) : (
                  <div className="admin-radio-card-face admin-radio-card-face--fallback" aria-hidden>
                    {player.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <label className="admin-radio-card-msg-label">
        <span className="sr-only">Radio message for {team.name}</span>
        <textarea
          className="admin-radio-card-textarea"
          rows={2}
          maxLength={140}
          placeholder="Message to display on arena…"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          disabled={disabled}
        />
      </label>
      <div className="admin-radio-card-deltas" role="group" aria-label="Progress adjustment">
        {DELTA_BUTTONS.map(({ delta, label }) => (
          <button
            key={delta}
            type="button"
            className="btn-secondary admin-radio-delta-btn"
            disabled={disabled}
            onClick={() => onApplyDelta(delta)}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}
