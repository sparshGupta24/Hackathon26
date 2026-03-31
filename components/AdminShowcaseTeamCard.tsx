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

export interface AdminShowcaseTeamCardProps {
  team: TeamState;
  onRemove: () => void;
  removeDisabled: boolean;
}

export function AdminShowcaseTeamCard({ team, onRemove, removeDisabled }: AdminShowcaseTeamCardProps) {
  const { templateId, livery } = liveryFor(team);

  return (
    <article className="admin-showcase-card">
      <div className="admin-showcase-card-livery" aria-hidden>
        <F1CarPreview
          templatePath={carSvgPathForTemplateId(templateId)}
          hexBuckets={liveryHexBucketsForTemplate(templateId)}
          primaryColor={livery.primaryColor}
          secondaryColor={livery.secondaryColor}
          tertiaryColor={livery.tertiaryColor}
          carNumber={livery.carNumber}
        />
      </div>
      <h3 className="admin-showcase-card-name">{team.name}</h3>
      <p className="admin-showcase-card-progress muted small">{team.progress}%</p>
      <div className="admin-showcase-card-faces" aria-label="Team members">
        {team.players.map((player) => (
          <div key={player.id} className="admin-showcase-card-face-wrap">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- roster URLs
              <img src={player.photoUrl} alt="" className="admin-showcase-card-face" width={36} height={36} />
            ) : (
              <div className="admin-showcase-card-face admin-showcase-card-face--fallback" aria-hidden>
                {player.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn-link admin-showcase-remove" onClick={onRemove} disabled={removeDisabled}>
        Remove team
      </button>
    </article>
  );
}
