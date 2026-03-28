"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ColorHsbPicker } from "@/components/ColorHsbPicker";
import { CircuitMapModal } from "@/components/CircuitMapModal";
import { F1CarPreview } from "@/components/F1CarPreview";
import { TeamCards } from "@/components/TeamCards";
import { LIVERY_PRESETS, MAX_PLAYERS, MIN_PLAYERS, TEAM_LIMIT } from "@/lib/constants";
import { useEventState } from "@/lib/useEventState";

interface RegistrationFormState {
  teamName: string;
  players: string[];
  livery: {
    preset: (typeof LIVERY_PRESETS)[number];
    primaryColor: string;
    secondaryColor: string;
    carNumber: number;
  };
  tertiaryColor: string;
  sponsor: {
    asset: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

const initialForm: RegistrationFormState = {
  teamName: "",
  players: [""],
  livery: {
    preset: LIVERY_PRESETS[0],
    primaryColor: "#D62828",
    secondaryColor: "#1D3557",
    carNumber: 7
  },
  tertiaryColor: "#8D99AE",
  sponsor: {
    asset: "/sponsors/sponsor1.svg",
    primaryColor: "#F7F8FB",
    secondaryColor: "#FF4C4C"
  }
};

const sponsorOptions = [
  { label: "Sponsor 1", value: "/sponsors/sponsor1.svg" },
  { label: "Sponsor 2", value: "/sponsors/sponsor2.svg" },
  { label: "Sponsor 3", value: "/sponsors/sponsor3.svg" },
  { label: "Sponsor 4", value: "/sponsors/sponsor4.svg" },
  { label: "Sponsor 5", value: "/sponsors/sponsor5.svg" }
];

export default function HomePage() {
  const { data, loading, error, refresh } = useEventState(true, 2000);
  const [formState, setFormState] = useState<RegistrationFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const registeredTeams = data?.teams.length ?? 0;
  const spotsLeft = Math.max(0, TEAM_LIMIT - registeredTeams);
  const registrationClosed = spotsLeft === 0;

  const cleanedPlayers = useMemo(
    () => formState.players.map((name) => name.trim()).filter(Boolean),
    [formState.players]
  );

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (cleanedPlayers.length < MIN_PLAYERS || cleanedPlayers.length > MAX_PLAYERS) {
      setFeedback(`Add between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/teams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: formState.teamName,
          players: cleanedPlayers,
          livery: {
            ...formState.livery,
            tertiaryColor: formState.tertiaryColor
          }
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Registration failed");
      }

      setFormState(initialForm);
      setFeedback("Team registered successfully.");
      await refresh();
    } catch (submitError) {
      setFeedback(submitError instanceof Error ? submitError.message : "Failed to register team.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="kicker">Trackside Ops</p>
          <h1>F1 Team Onboarding Arena</h1>
          <p className="muted">Register teams first, customize livery, then continue to the race timer screen.</p>
        </div>
        <div className="hero-actions">
          <Link href="/admin" className="btn-primary">
            Volunteer Console
          </Link>
          <Link href="/prompt-generator" className="btn-secondary">
            Prompt Generator
          </Link>
          <CircuitMapModal />
        </div>
      </header>

      {loading || !data ? (
        <p className="panel">Loading event state...</p>
      ) : (
        <>
          <section className="panel">
            <div className="section-head">
              <h2>Team Registration (Start Here)</h2>
              <span className={`pill ${registrationClosed ? "ended" : "idle"}`}>Slots left: {spotsLeft}</span>
            </div>

            <form className="form-grid" onSubmit={submitRegistration}>
              <label>
                Team Name
                <input
                  type="text"
                  maxLength={60}
                  value={formState.teamName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, teamName: event.target.value }))}
                  required
                  disabled={registrationClosed || submitting}
                />
              </label>

              <fieldset>
                <legend>Players (1-5)</legend>
                <div className="players-editor">
                  {formState.players.map((player, index) => (
                    <div key={`player-${index}`} className="inline-row">
                      <input
                        type="text"
                        placeholder={`Player ${index + 1}`}
                        value={player}
                        onChange={(event) => {
                          const nextPlayers = [...formState.players];
                          nextPlayers[index] = event.target.value;
                          setFormState((prev) => ({ ...prev, players: nextPlayers }));
                        }}
                        disabled={registrationClosed || submitting}
                      />
                      {formState.players.length > MIN_PLAYERS ? (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            const nextPlayers = formState.players.filter((_, position) => position !== index);
                            setFormState((prev) => ({ ...prev, players: nextPlayers }));
                          }}
                          disabled={registrationClosed || submitting}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      if (formState.players.length < MAX_PLAYERS) {
                        setFormState((prev) => ({ ...prev, players: [...prev.players, ""] }));
                      }
                    }}
                    disabled={registrationClosed || submitting || formState.players.length >= MAX_PLAYERS}
                  >
                    Add Player
                  </button>
                </div>
              </fieldset>

              <fieldset>
                <legend>F1 Livery Customization</legend>
                <div className="livery-layout">
                  <div className="livery-preview">
                    <F1CarPreview
                      primaryColor={formState.livery.primaryColor}
                      secondaryColor={formState.livery.secondaryColor}
                      tertiaryColor={formState.tertiaryColor}
                      carNumber={formState.livery.carNumber}
                      sponsorAsset={formState.sponsor.asset}
                      sponsorPrimaryColor={formState.sponsor.primaryColor}
                      sponsorSecondaryColor={formState.sponsor.secondaryColor}
                    />
                  </div>

                  <div className="livery-grid">
                    <ColorHsbPicker
                      label="Primary"
                      value={formState.livery.primaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          livery: {
                            ...prev.livery,
                            primaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <ColorHsbPicker
                      label="Secondary"
                      value={formState.livery.secondaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          livery: {
                            ...prev.livery,
                            secondaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <ColorHsbPicker
                      label="Tertiary"
                      value={formState.tertiaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          tertiaryColor: color
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <label>
                      Sponsor
                      <select
                        value={formState.sponsor.asset}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            sponsor: {
                              ...prev.sponsor,
                              asset: event.target.value
                            }
                          }))
                        }
                        disabled={registrationClosed || submitting}
                      >
                        {sponsorOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <ColorHsbPicker
                      label="Sponsor Primary"
                      value={formState.sponsor.primaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          sponsor: {
                            ...prev.sponsor,
                            primaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <ColorHsbPicker
                      label="Sponsor Secondary"
                      value={formState.sponsor.secondaryColor}
                      onChange={(color) =>
                        setFormState((prev) => ({
                          ...prev,
                          sponsor: {
                            ...prev.sponsor,
                            secondaryColor: color
                          }
                        }))
                      }
                      disabled={registrationClosed || submitting}
                    />

                    <label>
                      Car Number
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={formState.livery.carNumber}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            livery: {
                              ...prev.livery,
                              carNumber: Number(event.target.value)
                            }
                          }))
                        }
                        disabled={registrationClosed || submitting}
                      />
                    </label>
                  </div>
                </div>
              </fieldset>

              <button className="btn-primary" type="submit" disabled={registrationClosed || submitting}>
                {submitting ? "Registering..." : "Complete Registration"}
              </button>
            </form>

            {feedback ? <p className="feedback">{feedback}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Registered Teams ({registeredTeams}/{TEAM_LIMIT})</h2>
            </div>
            <TeamCards teams={data.teams} />
          </section>

          <section className="panel flow-next">
            <p className="muted">When all teams are ready, continue to the race screen.</p>
            <Link href="/arena" className="btn-primary">
              Go To Race Screen
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
