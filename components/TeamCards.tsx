import type { TeamState } from "@/lib/types";
import { F1CarPreview } from "@/components/F1CarPreview";

interface TeamCardsProps {
  teams: TeamState[];
}

export function TeamCards({ teams }: TeamCardsProps) {
  if (!teams.length) {
    return <p className="empty">No teams registered yet.</p>;
  }

  return (
    <div className="teams-grid">
      {teams.map((team, index) => (
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
              primaryColor={team.livery.primaryColor}
              secondaryColor={team.livery.secondaryColor}
              tertiaryColor={team.livery.tertiaryColor}
              carNumber={team.livery.carNumber}
            />
          ) : null}
          <ol className="players-list">
            {team.players.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}
