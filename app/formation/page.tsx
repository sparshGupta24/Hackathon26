"use client";

import Link from "next/link";
import { EventRunFlowNav } from "@/components/EventRunFlowNav";
import { F1CarPreview } from "@/components/F1CarPreview";
import { carSvgPathForTemplateId, liveryHexBucketsForTemplate } from "@/lib/carSvgs";
import { liveryForTeam } from "@/lib/teamLivery";
import type { TeamState } from "@/lib/types";
import { EventBrandLogos } from "@/components/EventBrandLogos";
import { useEventState } from "@/lib/useEventState";

const GRID_SLOTS = 6;

function hasPrompt(team: TeamState) {
  return typeof team.challengePrompt === "string" && team.challengePrompt.trim().length > 0;
}

export default function FormationPage() {
  const { data, loading, error } = useEventState(true, 10_000);
  const teams = data?.teams ?? [];
  const slots: Array<TeamState | null> = Array.from({ length: GRID_SLOTS }, (_, i) => teams[i] ?? null);

  return (
    <main className="formation-page">
      <header className="formation-header">
        <EventRunFlowNav current="formation" />
        <EventBrandLogos variant="formation" className="formation-header-logo" />
        <h1>Formation grid</h1>
      </header>

      {error ? <p className="error-text formation-error">{error}</p> : null}
      {loading && !data ? <p className="muted formation-loading">Loading teams…</p> : null}

      <div className="formation-grid" role="list">
        {slots.map((team, index) => (
          <FormationSlotCard key={team?.id ?? `formation-empty-${index}`} team={team} />
        ))}
      </div>

      <div className="formation-footer">
        <Link href="/sessionalert1" className="btn-primary formation-start-hack">
          Next
        </Link>
      </div>
    </main>
  );
}

function FormationSlotCard({ team }: { team: TeamState | null }) {
  if (!team) {
    return (
      <article className="formation-card formation-card--empty" role="listitem">
        <div className="formation-card-body formation-card-body--empty">
          <p className="formation-waiting">Waiting to join</p>
        </div>
        <div className="formation-prompt-bar formation-prompt-bar--off" aria-hidden />
        <p className="formation-prompt-label">Prompt status</p>
      </article>
    );
  }

  const { templateId, livery } = liveryForTeam(team);
  const promptOk = hasPrompt(team);
  const players = [...team.players].sort((a, b) => a.slot - b.slot);

  return (
    <article className="formation-card" role="listitem">
      <div className="formation-card-livery" aria-hidden>
        <F1CarPreview
          templatePath={carSvgPathForTemplateId(templateId)}
          hexBuckets={liveryHexBucketsForTemplate(templateId)}
          primaryColor={livery.primaryColor}
          secondaryColor={livery.secondaryColor}
          tertiaryColor={livery.tertiaryColor}
          carNumber={livery.carNumber}
        />
      </div>
      <div className="formation-faces" aria-label="Team members">
        {players.map((player) => (
          <div key={player.id} className="formation-face-wrap">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- roster URLs
              <img src={player.photoUrl} alt="" className="formation-face" width={36} height={36} />
            ) : (
              <div className="formation-face formation-face--fallback" aria-hidden>
                {player.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      <h2 className="formation-team-name">{team.name}</h2>
      <div
        className={
          promptOk ? "formation-prompt-bar formation-prompt-bar--ok" : "formation-prompt-bar formation-prompt-bar--pending"
        }
        aria-hidden
      />
      <p className="formation-prompt-label">Prompt status</p>
    </article>
  );
}
