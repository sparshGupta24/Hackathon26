"use client";

import { useCallback, useState } from "react";
import { PromptSlotMachine } from "@/components/PromptSlotMachine";

const MAX_SPINS = 3;

export function RegistrationPromptStep({
  teamId,
  teamName,
  disabled,
  onDone
}: {
  teamId: string;
  teamName: string;
  disabled?: boolean;
  onDone: () => void;
}) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spinsLeft = MAX_SPINS - prompts.length;
  const leverDisabled = disabled || prompts.length >= MAX_SPINS;

  const onSpinComplete = useCallback((prompt: string) => {
    setPrompts((prev) => {
      if (prev.length >= MAX_SPINS) {
        return prev;
      }
      const next = [...prev, prompt];
      setSelectedIndex(next.length - 1);
      return next;
    });
  }, []);

  async function handleFinalize() {
    if (selectedIndex === null || !prompts[selectedIndex]) {
      setError("Choose one of your generated prompts.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/teams/challenge-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          prompt: prompts[selectedIndex],
          spinsUsed: prompts.length
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save prompt");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="reg-prompt-step">
      <div className="reg-prompt-step-head">
        <p className="kicker">Step 2 of 2</p>
        <h2 className="reg-prompt-step-title">Challenge prompt</h2>
        <p className="muted small">
          <strong>{teamName}</strong> — spin up to {MAX_SPINS} times, then pick one prompt to attach to your team.
        </p>
        <p className="reg-prompt-spins muted small">
          Spins used: {prompts.length} / {MAX_SPINS}
          {spinsLeft > 0 ? ` · ${spinsLeft} left` : " · use a prompt below"}
        </p>
      </div>

      <PromptSlotMachine leverDisabled={leverDisabled} onSpinComplete={onSpinComplete} />

      <fieldset className="reg-prompt-picks panel">
        <legend className="reg-prompt-picks-legend">Choose your prompt</legend>
        <div className="reg-prompt-cards" role="radiogroup" aria-label="Generated prompts">
          {[0, 1, 2].map((idx) => {
            const text = prompts[idx];
            const filled = text !== undefined;
            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={selectedIndex === idx}
                aria-disabled={!filled}
                disabled={!filled}
                className={[
                  "reg-prompt-card",
                  filled ? "" : "reg-prompt-card--empty",
                  selectedIndex === idx && filled ? "reg-prompt-card--selected" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (filled) {
                    setSelectedIndex(idx);
                  }
                }}
              >
                <span className="reg-prompt-card-label">Prompt {idx + 1}</span>
                <span className="reg-prompt-card-body">{filled ? text : "???"}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error ? <p className="error-text reg-prompt-error">{error}</p> : null}

      <div className="reg-prompt-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || disabled || selectedIndex === null || prompts.length === 0}
          onClick={() => void handleFinalize()}
        >
          {saving ? "Saving…" : "Finish registration"}
        </button>
      </div>
    </div>
  );
}
