"use client";

import { useEffect } from "react";

export type RemoveTeamModalStep = 1 | 2;

export interface RemoveTeamModalProps {
  open: boolean;
  teamName: string;
  step: RemoveTeamModalStep;
  deleting: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function RemoveTeamModal({
  open,
  teamName,
  step,
  deleting,
  onCancel,
  onContinue,
  onBack,
  onConfirm
}: RemoveTeamModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="admin-remove-modal-overlay" role="presentation">
      <div
        className="admin-remove-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-remove-team-title"
      >
        {step === 1 ? (
          <>
            <h2 id="admin-remove-team-title" className="admin-remove-modal-title">
              Remove team?
            </h2>
            <p className="admin-remove-modal-body">
              You are about to remove <strong>{teamName}</strong> from the event. All crew members return to the draft
              pool and can be selected again during registration.
            </p>
            <div className="admin-remove-modal-actions">
              <button type="button" className="btn-secondary admin-remove-modal-btn" onClick={onCancel} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="btn-primary admin-remove-modal-btn" onClick={onContinue} disabled={deleting}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="admin-remove-team-title" className="admin-remove-modal-title">
              Final confirmation
            </h2>
            <p className="admin-remove-modal-body">
              This cannot be undone. Remove <strong>{teamName}</strong> from registered teams?
            </p>
            <div className="admin-remove-modal-actions">
              <button type="button" className="btn-secondary admin-remove-modal-btn" onClick={onBack} disabled={deleting}>
                Back
              </button>
              <button type="button" className="btn-danger admin-remove-modal-btn" onClick={onConfirm} disabled={deleting}>
                {deleting ? "Removing…" : "Remove team"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
