"use client";

/**
 * Reel scroll easing adapted from Ashley Firth (MrFirthy) — CSS/JS Slot machine:
 * https://codepen.io/MrFirthy/pen/oGVWqK
 *
 * Toggle lever from Alvaro Montoro (rotated 90° clockwise for layout):
 * https://codepen.io/alvaromontoro/pen/yLwyRzb
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const SLOT_ONE = [
  "A five-year-old",
  "A very sleepy sloth",
  "A golden retriever",
  "A confused medieval knight",
  "A goldfish with a three-second memory",
  "A Victorian butler",
  "A retired grandmother",
  "A dramatic opera singer",
  "A rubber duck",
  "A sentient vending machine"
];

const SLOT_TWO = [
  "Approve or reject applications",
  "Schedule and manage appointments",
  "Onboard and verify new members",
  "Assign and track tasks",
  "Process and respond to complaints",
  "Deliver performance reviews",
  "Manage bookings and reservations",
  "Submit and track expense reports",
  "Run a live auction",
  "Moderate and publish content"
];

const SLOT_THREE = [
  "A team of Nobel Prize-winning scientists",
  "A squad of impatient NFL quarterbacks",
  "A cohort of Michelin-star chefs",
  "A panel of Fortune 500 CEOs",
  "A delegation of intergalactic diplomats",
  "A crew of elite Navy SEALs",
  "A group of world-famous architects",
  "A league of professional esports champions",
  "A council of ancient Roman emperors",
  "A roster of Grammy-winning musicians"
];

/** Must match `--pg-item-h` and `--pg-visible` in globals.css */
const REEL_COPIES = 7;
const ITEM_PX = 78;
const VISIBLE_ROWS = 5;
const CENTER_ROW = (VISIBLE_ROWS - 1) / 2;

/** Each reel stops in sequence: reel 1, then 2, then 3 (ms from spin start). */
const REEL_STOP_MS = [2200, 3200, 4200] as const;

function pickRandomIndex(len: number): number {
  return Math.floor(Math.random() * len);
}

function buildStrip(items: readonly string[]): string[] {
  return Array.from({ length: REEL_COPIES }, () => [...items]).flat();
}

function finalScrollForWinner(winnerIdx: number, len: number): number {
  const rotations = 2 + Math.floor(Math.random() * 3);
  const g = rotations * len + winnerIdx;
  return (g - CENTER_ROW) * ITEM_PX;
}

export default function PromptGeneratorPage() {
  const [slotOne, setSlotOne] = useState(SLOT_ONE[0]);
  const [slotTwo, setSlotTwo] = useState(SLOT_TWO[0]);
  const [slotThree, setSlotThree] = useState(SLOT_THREE[0]);
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

  const promptText = useMemo(
    () => `${slotOne} needs to ${slotTwo} for ${slotThree}`,
    [slotOne, slotTwo, slotThree]
  );

  const stopSpin = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = undefined;
  }, []);

  useEffect(() => () => stopSpin(), [stopSpin]);

  function pullLever() {
    if (spinning) {
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
        setSlotOne(SLOT_ONE[w0]!);
        setSlotTwo(SLOT_TWO[w1]!);
        setSlotThree(SLOT_THREE[w2]!);
        setSpinning(false);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }

  return (
    <main className="page-shell">
      <header className="hero compact">
        <div>
          <p className="kicker">Creative Mode</p>
          <h1>Prompt Generator</h1>
          <p className="muted">Pull the lever to spin the reels and land on a random challenge prompt.</p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn-secondary">
            Home
          </Link>
          <Link href="/arena" className="btn-secondary">
            Arena
          </Link>
        </div>
      </header>

      <section className="panel pg-slot-machine">
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
                  disabled={spinning}
                  aria-label={spinning ? "Spinning reels" : "Pull lever to spin reels"}
                  aria-busy={spinning}
                />
              </div>
              <p className="pg-am-lever-hint muted small">{spinning ? "Spinning…" : "Pull the lever"}</p>
            </div>
          </div>
        </div>

        <p className="pg-slot-readout">{promptText}</p>
      </section>
    </main>
  );
}
