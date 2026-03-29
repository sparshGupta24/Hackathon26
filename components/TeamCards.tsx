import { F1CarPreview } from "@/components/F1CarPreview";
import {
  carSvgPathForTemplateId,
  liveryHexBucketsForTemplate,
  parseCarTemplateId
} from "@/lib/carSvgs";
import type { TeamState } from "@/lib/types";

interface TeamCardsProps {
  teams: TeamState[];
}

export function TeamCards({ teams }: TeamCardsProps) {
  if (!teams.length) {
    return <p className="empty">No teams registered yet.</p>;
  }

  return (
    <div className="teams-grid">
      {teams.map((team, index) => {
        const templateId = team.livery ? parseCarTemplateId(team.livery.carTemplate) ?? "01" : "01";
        return (
        <article className="team-card" key={team.id}>
          <div className="team-head">
            <h3>
              #{index + 1} {team.name}
            </h3>
            {team.livery ? (
              <div className="swatches">
                <span style={{ background: team.livery.primaryColor }} title="Primary color" />
                <span style={{ background: team.livery.secondaryColor }} title="Secondary color" />
              </div>
            ) : null}
          </div>
          {team.livery ? (
            <p className="muted small">
              Car #{team.livery.carNumber}
            </p>
          ) : null}
          {team.livery ? (
            <F1CarPreview
              templatePath={carSvgPathForTemplateId(templateId)}
              hexBuckets={liveryHexBucketsForTemplate(templateId)}
              primaryColor={team.livery.primaryColor}
              secondaryColor={team.livery.secondaryColor}
              tertiaryColor={team.livery.tertiaryColor}
              carNumber={team.livery.carNumber}
            />
          ) : null}
          <ol className="players-list">
            {team.players.map((player) => (
              <li key={player.id} className="players-list-item">
                {player.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URLs / data URLs from registration
                  <img src={player.photoUrl} alt="" className="player-roster-thumb" width={36} height={36} />
                ) : null}
                <span className="players-list-line">
                  {player.roleTitle ? (
                    <>
                      <span className="player-role-title">{player.roleTitle}</span>
                      <span className="player-role-sep" aria-hidden>
                        {" "}
                        —{" "}
                      </span>
                    </>
                  ) : null}
                  <span>{player.name}</span>
                </span>
              </li>
            ))}
          </ol>
        </article>
        );
      })}
    </div>
  );
}
