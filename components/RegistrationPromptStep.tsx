"use client";

import { useCallback, useState } from "react";
import { PromptSlotMachine, type PromptSlotSpinResult } from "@/components/PromptSlotMachine";
import {
  PROMPT_PERMUTATION_COUNT,
  REGISTRATION_SLOT_CONTEXT,
  REGISTRATION_SLOT_DIRECTION,
  REGISTRATION_SLOT_USERS
} from "@/lib/promptPermutations";

const COLUMN_LABELS = ["Your users", "Your context", "Your direction"] as const;

export function RegistrationPromptStep({
  teamId,
  teamName,
  disabled,
  availablePermutationIndices,
  onRefreshState,
  onDone
}: {
  teamId: string;
  teamName: string;
  disabled?: boolean;
  /** Row indices 0..PROMPT_PERMUTATION_COUNT-1 not yet claimed by any team. */
  availablePermutationIndices: number[];
  onRefreshState: () => void | Promise<void>;
  onDone: () => void;
}) {
  const [permutationIndex, setPermutationIndex] = useState<number | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [machineNonce, setMachineNonce] = useState(0);

  const noRowsLeft = availablePermutationIndices.length === 0;
  const spinDone = permutationIndex !== null;
  const leverLocked = disabled || noRowsLeft || spinDone;

  const onSpinComplete = useCallback((result: PromptSlotSpinResult) => {
    if (result.permutationIndex === undefined) {
      return;
    }
    setPermutationIndex(result.permutationIndex);
    const parts = result.prompt.split(" — ");
    setPreviewPrompt(parts.slice(0, 2).join(" — "));
    setError(null);
  }, []);

  async function handleFinalize() {
    if (permutationIndex === null) {
      setError("Pull the lever once to draw your prompt row.");
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
          permutationIndex
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        const msg = payload.error ?? "Failed to save prompt";
        if (msg.toLowerCase().includes("just claimed") || msg.toLowerCase().includes("another team")) {
          await onRefreshState();
          setPermutationIndex(null);
          setPreviewPrompt(null);
          setMachineNonce((n) => n + 1);
        }
        throw new Error(msg);
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
          <strong>{teamName}</strong> — one spin only. You see <strong>users</strong> and <strong>context</strong>; the
          full challenge row (including direction) is saved for the event but only the first two parts are shown here.
          Each row can only be assigned once across all teams ({PROMPT_PERMUTATION_COUNT} total).
        </p>
        {noRowsLeft ? (
          <p className="error-text reg-prompt-error">
            Every prompt row is already taken. Ask an organizer to free or extend the pool.
          </p>
        ) : (
          <p className="reg-prompt-spins muted small">
            Rows left for new teams: {availablePermutationIndices.length} / {PROMPT_PERMUTATION_COUNT}
          </p>
        )}
      </div>

      <PromptSlotMachine
        key={machineNonce}
        leverDisabled={leverLocked}
        onSpinComplete={onSpinComplete}
        slotOne={REGISTRATION_SLOT_USERS}
        slotTwo={REGISTRATION_SLOT_CONTEXT}
        slotThree={REGISTRATION_SLOT_DIRECTION}
        synchronized
        allowedIndices={availablePermutationIndices}
        columnLabels={COLUMN_LABELS}
        connectorStyle="dash"
        hideThirdReel
      />

      {previewPrompt && spinDone ? (
        <div className="reg-prompt-single-pick panel">
          <p className="reg-prompt-single-pick-label">Your challenge prompt</p>
          <p className="reg-prompt-single-pick-body">{previewPrompt}</p>
        </div>
      ) : null}

      {error ? <p className="error-text reg-prompt-error">{error}</p> : null}

      <div className="reg-prompt-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || disabled || permutationIndex === null || noRowsLeft}
          onClick={() => void handleFinalize()}
        >
          {saving ? "Saving…" : "Finish registration"}
        </button>
      </div>
    </div>
  );
}
