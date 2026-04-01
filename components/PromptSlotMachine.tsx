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

export type PromptSlotSpinResult = {
  prompt: string;
  /** Set when reels use the same row index (registration permutations). */
  permutationIndex?: number;
};

export type PromptSlotMachineProps = {
  leverDisabled?: boolean;
  onSpinComplete?: (result: PromptSlotSpinResult) => void;
  className?: string;
  slotOne?: readonly string[];
  slotTwo?: readonly string[];
  slotThree?: readonly string[];
  /** All three reels land on the same list index. */
  synchronized?: boolean;
  /** When synchronized, only these indices may win (e.g. rows not yet taken by another team). */
  allowedIndices?: number[];
  /** Optional headings above reels (e.g. Your users — Your context — Your direction). */
  columnLabels?: readonly [string, string, string];
  /** Registration uses em-dash separators; generator uses phrase glue. */
  connectorStyle?: "phrase" | "dash";
  /** Hide reel 3 and readout text for slot 3; still picks & reports full row (e.g. registration). */
  hideThirdReel?: boolean;
};

export function PromptSlotMachine({
  leverDisabled,
  onSpinComplete,
  className,
  slotOne = SLOT_ONE,
  slotTwo = SLOT_TWO,
  slotThree = SLOT_THREE,
  synchronized = false,
  allowedIndices,
  columnLabels,
  connectorStyle = "phrase",
  hideThirdReel = false
}: PromptSlotMachineProps) {
  const [rowOne, setRowOne] = useState<string>(slotOne[0] ?? "");
  const [rowTwo, setRowTwo] = useState<string>(slotTwo[0] ?? "");
  const [rowThree, setRowThree] = useState<string>(slotThree[0] ?? "");
  const [spinning, setSpinning] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);

  const strip1 = useMemo(() => buildStrip(slotOne), [slotOne]);
  const strip2 = useMemo(() => buildStrip(slotTwo), [slotTwo]);
  const strip3 = useMemo(() => buildStrip(slotThree), [slotThree]);

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
  }, [strip1.length, strip2.length, strip3.length, syncAllReelTiers]);

  useLayoutEffect(() => {
    syncAllReelTiers();
  }, [rowOne, rowTwo, rowThree, spinning, syncAllReelTiers]);

  const stopSpin = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = undefined;
  }, []);

  useEffect(() => () => stopSpin(), [stopSpin]);

  const len1 = slotOne.length;
  const len2 = slotTwo.length;
  const len3 = slotThree.length;

  function pullLever() {
    if (spinning || leverDisabled) {
      return;
    }

    let w0: number;
    let w1: number;
    let w2: number;

    if (synchronized) {
      const pool =
        allowedIndices !== undefined && allowedIndices.length > 0
          ? allowedIndices
          : Array.from({ length: len1 }, (_, i) => i);
      if (pool.length === 0 || len1 !== len2 || len2 !== len3) {
        return;
      }
      const w = pool[Math.floor(Math.random() * pool.length)]!;
      w0 = w1 = w2 = w;
    } else {
      w0 = pickRandomIndex(len1);
      w1 = pickRandomIndex(len2);
      w2 = pickRandomIndex(len3);
    }

    const numberOutput = [
      finalScrollForWinner(w0, len1),
      finalScrollForWinner(w1, len2),
      finalScrollForWinner(w2, len3)
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
              setRowOne(slotOne[w0]!);
            } else if (i === 1) {
              setRowTwo(slotTwo[w1]!);
            } else {
              setRowThree(slotThree[w2]!);
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
        const a = slotOne[w0]!;
        const b = slotTwo[w1]!;
        const c = slotThree[w2]!;
        setRowOne(a);
        setRowTwo(b);
        setRowThree(c);
        setSpinning(false);
        syncAllReelTiers();
        const prompt = synchronized ? `${a} — ${b} — ${c}` : composePrompt(a, b, c);
        onSpinCompleteRef.current?.({
          prompt,
          ...(synchronized ? { permutationIndex: w0 } : {})
        });
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }

  const registrationClass = columnLabels ? " pg-slot-machine--registration" : "";
  const twoReelOnly = Boolean(hideThirdReel);

  return (
    <section
      className={["panel pg-slot-machine", registrationClass, twoReelOnly ? "pg-slot-machine--two-reels" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pg-slot-chrome">
        <div className="pg-slot-lamps" aria-hidden />
        {columnLabels ? (
          <div className="pg-slot-labels-row" aria-hidden>
            <span className="pg-slot-col-label">{columnLabels[0]}</span>
            <span className="pg-slot-label-sep">--</span>
            <span className="pg-slot-col-label">{columnLabels[1]}</span>
            {!twoReelOnly ? (
              <>
                <span className="pg-slot-label-sep">--</span>
                <span className="pg-slot-col-label">{columnLabels[2]}</span>
              </>
            ) : null}
            <div className="pg-slot-labels-lever-gap" />
          </div>
        ) : null}
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
          {connectorStyle === "dash" ? (
            <div className="pg-slot-connector pg-slot-connector--dash" aria-hidden>
              --
            </div>
          ) : (
            <div className="pg-slot-connector pg-slot-connector--stack">
              <span className="pg-slot-connector-line">needs</span>
              <span className="pg-slot-connector-line">to</span>
            </div>
          )}
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
          {!twoReelOnly ? (
            <>
              {connectorStyle === "dash" ? (
                <div className="pg-slot-connector pg-slot-connector--dash" aria-hidden>
                  --
                </div>
              ) : (
                <div className="pg-slot-connector pg-slot-connector--stack">
                  <span className="pg-slot-connector-line">for</span>
                </div>
              )}
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
            </>
          ) : null}
          <div className="pg-am-lever-column">
            <div className="pg-am-lever-host">
              <button
                type="button"
                className={`am-lever ${spinning ? "am-lever--pulled" : ""}`}
                onClick={pullLever}
                disabled={spinning || leverDisabled}
                aria-label={
                  spinning
                    ? "Spinning reels"
                    : leverDisabled
                      ? "Lever locked"
                      : synchronized
                        ? "Pull lever once for your prompt row"
                        : "Pull lever to spin reels"
                }
                aria-busy={spinning}
              />
            </div>
          </div>
        </div>
      </div>

      {connectorStyle === "dash" ? (
        <p className="pg-slot-readout pg-slot-readout--triple">
          <strong className="pg-slot-readout-slot">{rowOne}</strong>
          <span className="pg-slot-readout-glue"> — </span>
          <strong className="pg-slot-readout-slot">{rowTwo}</strong>
          {!twoReelOnly ? (
            <>
              <span className="pg-slot-readout-glue"> — </span>
              <strong className="pg-slot-readout-slot">{rowThree}</strong>
            </>
          ) : null}
        </p>
      ) : (
        <p className="pg-slot-readout">
          <strong className="pg-slot-readout-slot">{leadLower(rowOne)}</strong>{" "}
          <span className="pg-slot-readout-glue">needs to</span>{" "}
          <strong className="pg-slot-readout-slot">{leadLower(rowTwo)}</strong>
          {!twoReelOnly ? (
            <>
              {" "}
              <span className="pg-slot-readout-glue">for</span>{" "}
              <strong className="pg-slot-readout-slot">{leadLower(rowThree)}</strong>
            </>
          ) : null}
        </p>
      )}
    </section>
  );
}
