"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { showdownTeamDescription } from "@/lib/showdownTeamCopy";
import type { TeamState } from "@/lib/types";
import {
  SHOWDOWN_TEAM_IMAGE_EXTENSIONS,
  showdownTeamImageSrc,
  showdownTeamSlug
} from "@/lib/showdownSlotTeamImage";

export function ShowdownTeamFullscreenModal({ team, onClose }: { team: TeamState; onClose: () => void }) {
  const slug = showdownTeamSlug(team.name);
  const [extIndex, setExtIndex] = useState(0);
  const maxExt = SHOWDOWN_TEAM_IMAGE_EXTENSIONS.length;
  const showImage = extIndex < maxExt;
  const src = showImage ? showdownTeamImageSrc(slug, extIndex) : "";

  const description = showdownTeamDescription(team.name);

  const crewRows = useMemo(
    () => [...team.players].sort((a, b) => a.slot - b.slot),
    [team.players]
  );

  const onImageError = useCallback(() => {
    setExtIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    setExtIndex(0);
  }, [team.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="showdown-slot-modal showdown-slot-modal--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="showdown-slot-fs-title"
    >
      <div className="showdown-slot-modal-fs-image-layer">
        {!showImage ? (
          <div className="showdown-slot-modal-fs-placeholder">
            <p className="showdown-slot-modal-fs-placeholder-text">
              No image found. Add one of:
            </p>
            <p className="showdown-slot-modal-fs-placeholder-path">
              <code className="showdown-slot-modal-fs-code">
                public/showdown-teams/{slug}/full.jpg
              </code>
              <span className="showdown-slot-modal-fs-or"> · </span>
              <code className="showdown-slot-modal-fs-code">.png</code>
              <span className="showdown-slot-modal-fs-or"> · </span>
              <code className="showdown-slot-modal-fs-code">.webp</code>
            </p>
          </div>
        ) : (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            className="showdown-slot-modal-fs-img"
            sizes="100vw"
            priority
            onError={onImageError}
          />
        )}
      </div>

      <div className="showdown-slot-modal-fs-top">
        <div className="showdown-slot-modal-fs-top-cluster">
          <button type="button" className="btn-secondary showdown-slot-modal-fs-close" onClick={onClose}>
            Close
          </button>

          {crewRows.length > 0 ? (
            <div className="showdown-slot-modal-fs-crew-card">
              <p className="showdown-slot-modal-fs-crew-heading">Crew</p>
              <ul className="showdown-slot-modal-fs-crew-list">
                {crewRows.map((p) => (
                  <li key={p.id} className="showdown-slot-modal-fs-crew-row">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external roster URLs
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="showdown-slot-modal-fs-crew-photo"
                        width={36}
                        height={36}
                      />
                    ) : (
                      <span className="showdown-slot-modal-fs-crew-photo showdown-slot-modal-fs-crew-photo--fallback" aria-hidden>
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="showdown-slot-modal-fs-crew-meta">
                      <span className="showdown-slot-modal-fs-crew-role">{p.roleTitle ?? "Crew"}</span>
                      <span className="showdown-slot-modal-fs-crew-name">{p.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="showdown-slot-modal-fs-bottom">
        <div className="showdown-slot-modal-fs-bottom-inner">
          <h2 id="showdown-slot-fs-title" className="showdown-slot-modal-fs-title">
            {team.name}
          </h2>
          {description ? (
            <p className="showdown-slot-modal-fs-desc">{description}</p>
          ) : (
            <p className="showdown-slot-modal-fs-desc showdown-slot-modal-fs-desc--empty muted">
              No story blurb is set for this team name yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
