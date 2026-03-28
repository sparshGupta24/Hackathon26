"use client";

import Image from "next/image";
import { useState } from "react";

interface CircuitMapModalProps {
  triggerLabel?: string;
  className?: string;
}

export function CircuitMapModal({ triggerLabel = "View Circuit", className }: CircuitMapModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={className ?? "btn-secondary"} type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Circuit map">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Grand Circuit Map</h2>
              <button className="modal-close-btn" type="button" onClick={() => setOpen(false)} aria-label="Close map">
                ×
              </button>
            </div>
            <p className="muted">Placeholder map asset. Replace `/public/circuit-placeholder.svg` anytime.</p>
            <div className="map-wrap">
              <Image
                src="/circuit-placeholder.svg"
                alt="Circuit map"
                width={1400}
                height={880}
                className="map-image"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
