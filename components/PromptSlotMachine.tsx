"use client";

/**
 * Reel scroll easing adapted from Ashley Firth (MrFirthy) — CSS/JS Slot machine:
 * https://codepen.io/MrFirthy/pen/oGVWqK
 *
 * Toggle lever from Alvaro Montoro (rotated 90° clockwise for layout):
 * https://codepen.io/alvaromontoro/pen/yLwyRzb
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildStrip,
  composePrompt,
  finalScrollForWinner,
  ITEM_PX,
  leadLower,
  pickRandomIndex,
  REEL_STOP_MS,
  SLOT_ONE,
  SLOT_TWO,
  SLOT_THREE
} from "@/lib/promptSlots";

function syncReelWindowTier(windowEl: HTMLDivElement) {
  const strip = windowEl.querySelector(".pg-reel-strip");
  if (!strip) {
    return;
  }
  const items = strip.querySelectorAll<HTMLElement>(".pg-reel-item");
  const scrollTop = windowEl.scrollTop;
  const viewMid = scrollTop + windowEl.clientHeight / 2;
  items.forEach((item) => {
    const itemMid = item.offsetTop + item.offsetHeight / 2;
    const distRows = Math.abs(viewMid - itemMid) / ITEM_PX;
    const tier = Math.min(4, Math.round(distRows));
    item.dataset.pgTier = String(tier);
  });
}

export interface PromptSlotMachineProps {
  /** When true, lever is disabled (e.g. max spins reached). */
  leverDisabled?: boolean;
  /** Called once when a spin animation fully finishes with the composed prompt. */
  onSpinComplete?: (prompt: string) => void;
  className?: string;
}

export function PromptSlotMachine({ leverDisabled, onSpinComplete, className }: PromptSlotMachineProps) {
  const [slotOne, setSlotOne] = useState<string>(SLOT_ONE[0]);
  const [slotTwo, setSlotTwo] = useState<string>(SLOT_TWO[0]);
  const [slotThree, setSlotThree] = useState<string>(SLOT_THREE[0]);
  const [spinning, setSpinning] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);

  const strip1 = useMemo(() => buildStrip(SLOT_ONE), []);
  const strip2 = useMemo(() => buildStrip(SLOT_TWO), []);
  const strip3 = useMemo(() => buildStrip(SLOT_THREE), []);

  const reel0 = useRef<HTMLDivElement>(null);
  const reel1 = useRef<HTMLDivElement>(null);
  const reel2 = useRef<HTMLDivElement>(null);
  const reelRefs = [reel0, reel1, reel2] as const;

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | undefined>(undefined);
  const settledRef = useRef([false, false, false]);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  const syncAllReelTiers = useCallback(() => {
    for (const ref of reelRefs) {
      const el = ref.current;
      if (el) {
        syncReelWindowTier(el);
      }
    }
  }, []);

  useLayoutEffect(() => {
    const cleanups: (() => void)[] = [];
    for (const ref of reelRefs) {
      const el = ref.current;
      if (!el) {
        continue;
      }
      const onScroll = () => syncAllReelTiers();
      el.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => el.removeEventListener("scroll", onScroll));
    }
    const id = requestAnimationFrame(() => syncAllReelTiers());
    return () => {
      cancelAnimationFrame(id);
      cleanups.forEach((fn) => fn());
    };
  }, [strip1.length, syncAllReelTiers]);

  useLayoutEffect(() => {
    syncAllReelTiers();
  }, [slotOne, slotTwo, slotThree, spinning, syncAllReelTiers]);

  const stopSpin = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = undefined;
  }, []);

  useEffect(() => () => stopSpin(), [stopSpin]);

  function pullLever() {
    if (spinning || leverDisabled) {
      return;
    }

    const w0 = pickRandomIndex(SLOT_ONE.length);
    const w1 = pickRandomIndex(SLOT_TWO.length);
    const w2 = pickRandomIndex(SLOT_THREE.length);

    const numberOutput = [
      finalScrollForWinner(w0, SLOT_ONE.length),
      finalScrollForWinner(w1, SLOT_TWO.length),
      finalScrollForWinner(w2, SLOT_THREE.length)
    ];
    const speeds = [Math.random() + 0.7, Math.random() + 0.7, Math.random() + 0.7];

    setDoorsOpen(true);
    setSpinning(true);
    settledRef.current = [false, false, false];
    stopSpin();
    startRef.current = undefined;

    const spinTotal = REEL_STOP_MS[2]!;

    function animate(now: number) {
      if (startRef.current === undefined) {
        startRef.current = now;
      }
      const t = now - startRef.current;

      for (let i = 0; i < 3; i++) {
        const el = reelRefs[i]?.current;
        if (!el) {
          continue;
        }
        const tMax = REEL_STOP_MS[i]!;
        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        const mod = Math.max(1, maxScroll);

        if (t >= tMax) {
          el.scrollTop = Math.min(Math.max(0, numberOutput[i]!), maxScroll);
          if (!settledRef.current[i]) {
            settledRef.current[i] = true;
            if (i === 0) {
              setSlotOne(SLOT_ONE[w0]!);
            } else if (i === 1) {
              setSlotTwo(SLOT_TWO[w1]!);
            } else {
              setSlotThree(SLOT_THREE[w2]!);
            }
          }
        } else {
          const te = t;
          const next =
            ((speeds[i]! / tMax / 2) * (tMax - te) * (tMax - te) + numberOutput[i]!) % mod | 0;
          el.scrollTop = next;
        }
      }

      syncAllReelTiers();

      if (t < spinTotal) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        startRef.current = undefined;
        for (let i = 0; i < 3; i++) {
          const el = reelRefs[i]?.current;
          if (!el) {
            continue;
          }
          const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
          el.scrollTop = Math.min(Math.max(0, numberOutput[i]!), maxScroll);
        }
        const a = SLOT_ONE[w0]!;
        const b = SLOT_TWO[w1]!;
        const c = SLOT_THREE[w2]!;
        setSlotOne(a);
        setSlotTwo(b);
        setSlotThree(c);
        setSpinning(false);
        syncAllReelTiers();
        onSpinCompleteRef.current?.(composePrompt(a, b, c));
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }

  return (
    <section className={["panel pg-slot-machine", className].filter(Boolean).join(" ")}>
      <div className="pg-slot-chrome">
        <div className="pg-slot-lamps" aria-hidden />
        <div className="pg-slot-machine-row">
          <div className={`pg-reel ${spinning ? "pg-reel--spinning" : ""} ${doorsOpen ? "pg-reel--doors-open" : ""}`}>
            <div className="pg-reel-door" aria-hidden />
            <div ref={reelRefs[0]} className="pg-reel-window">
              <div className="pg-reel-strip">
                {strip1.map((text, idx) => (
                  <div key={`s1-${idx}`} className="pg-reel-item">
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pg-slot-connector pg-slot-connector--stack">
            <span className="pg-slot-connector-line">needs</span>
            <span className="pg-slot-connector-line">to</span>
          </div>
          <div className={`pg-reel ${spinning ? "pg-reel--spinning" : ""} ${doorsOpen ? "pg-reel--doors-open" : ""}`}>
            <div className="pg-reel-door" aria-hidden />
            <div ref={reelRefs[1]} className="pg-reel-window">
              <div className="pg-reel-strip">
                {strip2.map((text, idx) => (
                  <div key={`s2-${idx}`} className="pg-reel-item">
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pg-slot-connector pg-slot-connector--stack">
            <span className="pg-slot-connector-line">for</span>
          </div>
          <div className={`pg-reel ${spinning ? "pg-reel--spinning" : ""} ${doorsOpen ? "pg-reel--doors-open" : ""}`}>
            <div className="pg-reel-door" aria-hidden />
            <div ref={reelRefs[2]} className="pg-reel-window">
              <div className="pg-reel-strip">
                {strip3.map((text, idx) => (
                  <div key={`s3-${idx}`} className="pg-reel-item">
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pg-am-lever-column">
            <div className="pg-am-lever-host">
              <button
                type="button"
                className={`am-lever ${spinning ? "am-lever--pulled" : ""}`}
                onClick={pullLever}
                disabled={spinning || leverDisabled}
                aria-label={spinning ? "Spinning reels" : leverDisabled ? "No spins remaining" : "Pull lever to spin reels"}
                aria-busy={spinning}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="pg-slot-readout">
        <strong className="pg-slot-readout-slot">{leadLower(slotOne)}</strong>{" "}
        <span className="pg-slot-readout-glue">needs to</span>{" "}
        <strong className="pg-slot-readout-slot">{leadLower(slotTwo)}</strong>{" "}
        <span className="pg-slot-readout-glue">for</span>{" "}
        <strong className="pg-slot-readout-slot">{leadLower(slotThree)}</strong>
      </p>
    </section>
  );
}
