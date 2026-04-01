"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PersonPublic } from "@/lib/types";

export interface PlayerDraftPopoverProps {
  open: boolean;
  roleTitle: string;
  roleSubtitle?: string;
  people: PersonPublic[];
  /** Already on a registered team — cannot pick; show Drafted watermark. */
  draftedIds: ReadonlySet<string>;
  /** Selected in another role slot on this form — cannot pick. */
  blockedByOtherRoles: ReadonlySet<string>;
  currentSelectionId: string;
  onClose: () => void;
  onSelect: (personId: string) => void;
  triggerDisabled?: boolean;
  /** Show control to clear selection (optional roles only). */
  allowClear?: boolean;
}

export function PlayerDraftPopover({
  open,
  roleTitle,
  roleSubtitle,
  people,
  draftedIds,
  blockedByOtherRoles,
  currentSelectionId,
  onClose,
  onSelect,
  triggerDisabled,
  allowClear
}: PlayerDraftPopoverProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return people;
    }
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay player-draft-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose player for ${roleTitle}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card player-draft-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{roleTitle}</h2>
            {roleSubtitle ? <p className="muted small player-draft-subtitle">{roleSubtitle}</p> : null}
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Close player picker">
            ×
          </button>
        </div>

        <label className="player-draft-search">
          <span className="sr-only">Search players by name</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search by name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            disabled={triggerDisabled}
          />
        </label>

        {allowClear && currentSelectionId.trim() ? (
          <div className="player-draft-clear-wrap">
            <button
              type="button"
              className="btn-secondary player-draft-clear"
              onClick={() => {
                onSelect("");
                onClose();
              }}
            >
              Leave role unassigned
            </button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="muted small">No players match your search.</p>
        ) : (
          <div className="player-draft-grid" role="listbox" aria-label="Players">
            {filtered.map((person) => {
              const isDrafted = draftedIds.has(person.id);
              const blockedHere = blockedByOtherRoles.has(person.id);
              const disabled = Boolean(triggerDisabled) || isDrafted || blockedHere;
              const isCurrent = currentSelectionId.trim() === person.id;

              return (
                <button
                  key={person.id}
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  aria-disabled={disabled}
                  disabled={disabled}
                  className={`player-draft-cell${isCurrent ? " player-draft-cell--current" : ""}${isDrafted ? " player-draft-cell--drafted" : ""}${blockedHere && !isDrafted ? " player-draft-cell--blocked" : ""}`}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    onSelect(person.id);
                    onClose();
                  }}
                >
                  <div className="player-draft-photo-wrap">
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- roster URLs / remote
                      <img src={person.photoUrl} alt="" className="player-draft-photo" width={80} height={80} />
                    ) : (
                      <div className="player-draft-photo-fallback" aria-hidden>
                        {person.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {isDrafted ? (
                      <span className="player-draft-watermark" aria-hidden>
                        Drafted
                      </span>
                    ) : null}
                  </div>
                  <span className="player-draft-name">{person.name}</span>
                  {blockedHere && !isDrafted ? (
                    <span className="player-draft-badge">Other role</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
