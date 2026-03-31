"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import type { TeamState, VolunteerAwardKey, VolunteerRewardsState } from "@/lib/types";
import {
  VOLUNTEER_AWARDS,
  emptyVolunteerRewardSelections,
  type VolunteerRewardsPayload
} from "@/lib/volunteerRewards";

function selectionsFromServer(awards: VolunteerRewardsState["awards"]): Record<VolunteerAwardKey, string> {
  const out = emptyVolunteerRewardSelections();
  for (const a of VOLUNTEER_AWARDS) {
    out[a.key] = awards[a.key]?.teamId ?? "";
  }
  return out;
}

export function VolunteerRewardsSection({
  teams,
  disabled
}: {
  teams: TeamState[];
  disabled?: boolean;
}) {
  const [selections, setSelections] = useState<Record<VolunteerAwardKey, string>>(emptyVolunteerRewardSelections);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/rewards", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load rewards");
      }
      const data = (await response.json()) as VolunteerRewardsState;
      setSelections(selectionsFromServer(data.awards));
    } catch {
      setLoadError("Could not load saved awards. You can still edit and save.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);
    setSaving(true);
    try {
      const body: VolunteerRewardsPayload = {
        fastestLap: selections.fastestLap,
        pitPerfect: selections.pitPerfect,
        bestAerodynamics: selections.bestAerodynamics,
        raceStrategists: selections.raceStrategists,
        crashComeback: selections.crashComeback,
        boldestOvertake: selections.boldestOvertake,
        grandPrixShowcase: selections.grandPrixShowcase
      };
      const response = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json()) as { error?: string; rewards?: VolunteerRewardsState };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save awards");
      }
      if (payload.rewards) {
        setSelections(selectionsFromServer(payload.rewards.awards));
      }
      setSaveMessage("Awards saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Could not save awards.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel admin-rewards-panel">
      <div className="section-head">
        <h2>Rewards</h2>
        <span className="pill idle">Volunteer picks</span>
      </div>
      <p className="muted small">
        Choose one registered team per category. Selections are stored in Firestore for results and displays later.
      </p>
      {loadError ? <p className="muted small admin-rewards-load-hint">{loadError}</p> : null}
      {loading ? (
        <p className="muted small">Loading saved awards…</p>
      ) : teams.length === 0 ? (
        <p className="muted small">Register teams first to assign awards.</p>
      ) : (
        <form className="admin-rewards-form" onSubmit={(e) => void onSubmit(e)}>
          <ul className="admin-rewards-list">
            {VOLUNTEER_AWARDS.map((award) => (
              <li key={award.key} className="admin-rewards-row">
                <div className="admin-rewards-row-text">
                  <p className="admin-rewards-title">{award.title}</p>
                  <p className="muted small admin-rewards-desc">{award.description}</p>
                </div>
                <label className="admin-rewards-select-label">
                  <span className="sr-only">Team for {award.title}</span>
                  <select
                    value={selections[award.key]}
                    onChange={(e) =>
                      setSelections((prev) => ({
                        ...prev,
                        [award.key]: e.target.value
                      }))
                    }
                    disabled={disabled || saving}
                  >
                    <option value="">— Select team —</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
          <div className="admin-rewards-actions">
            <button type="submit" className="btn-primary" disabled={disabled || saving}>
              {saving ? "Saving…" : "Save awards"}
            </button>
          </div>
          {saveMessage ? (
            <p className={saveMessage.startsWith("Awards saved") ? "feedback small" : "error-text small"}>{saveMessage}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
