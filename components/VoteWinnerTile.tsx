import { brightestLiveryHex } from "@/lib/teamLivery";
import type { TeamState } from "@/lib/types";

export interface VoteWinnerTileProps {
  categoryLabel: string;
  playerName: string;
  teamName: string;
  photoUrl?: string;
  team: TeamState | null;
  voteCount: number;
}

export function VoteWinnerTile({
  categoryLabel,
  playerName,
  teamName,
  photoUrl,
  team,
  voteCount
}: VoteWinnerTileProps) {
  const accent = brightestLiveryHex(team?.livery ?? null);

  return (
    <article
      className="vote-winner-tile"
      style={
        {
          "--vote-accent": accent
        } as React.CSSProperties
      }
    >
      <p className="vote-winner-tile-kicker">{categoryLabel}</p>
      <div className="vote-winner-tile-inner">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- roster URLs
          <img src={photoUrl} alt="" className="vote-winner-tile-photo" width={96} height={96} />
        ) : (
          <div className="vote-winner-tile-photo vote-winner-tile-photo--fallback" aria-hidden>
            {playerName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="vote-winner-tile-text">
          <h3 className="vote-winner-tile-name">{playerName}</h3>
          <p className="vote-winner-tile-team">{teamName}</p>
          <p className="vote-winner-tile-count muted small">
            {voteCount} vote{voteCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </article>
  );
}
