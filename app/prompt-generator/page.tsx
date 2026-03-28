"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function PromptGeneratorPage() {
  const [slotOne, setSlotOne] = useState(SLOT_ONE[0]);
  const [slotTwo, setSlotTwo] = useState(SLOT_TWO[0]);
  const [slotThree, setSlotThree] = useState(SLOT_THREE[0]);
  const [spinning, setSpinning] = useState(false);
  const spinIntervalRef = useRef<number | null>(null);

  const promptText = useMemo(() => `${slotOne} needs ${slotTwo} for ${slotThree}`, [slotOne, slotTwo, slotThree]);

  function stopSpin() {
    if (spinIntervalRef.current !== null) {
      window.clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
  }

  function pullLever() {
    if (spinning) {
      return;
    }
    setSpinning(true);

    spinIntervalRef.current = window.setInterval(() => {
      setSlotOne(pickRandom(SLOT_ONE));
      setSlotTwo(pickRandom(SLOT_TWO));
      setSlotThree(pickRandom(SLOT_THREE));
    }, 95);

    window.setTimeout(() => {
      stopSpin();
      setSlotOne(pickRandom(SLOT_ONE));
      setSlotTwo(pickRandom(SLOT_TWO));
      setSlotThree(pickRandom(SLOT_THREE));
      setSpinning(false);
    }, 1600);
  }

  useEffect(() => {
    return () => {
      stopSpin();
    };
  }, []);

  return (
    <main className="page-shell">
      <header className="hero compact">
        <div>
          <p className="kicker">Creative Mode</p>
          <h1>Prompt Generator</h1>
          <p className="muted">Pull the lever to generate a random challenge prompt.</p>
        </div>
        <div className="hero-actions">
          <Link href="/arena" className="btn-secondary">
            Back To Arena
          </Link>
        </div>
      </header>

      <section className="panel slot-machine">
        <div className="slot-row">
          <div className="slot-cell">{slotOne}</div>
          <span className="slot-connector">needs</span>
          <div className="slot-cell">{slotTwo}</div>
          <span className="slot-connector">for</span>
          <div className="slot-cell">{slotThree}</div>
        </div>

        <div className="slot-controls">
          <button type="button" className="slot-lever-btn" onClick={pullLever} disabled={spinning}>
            {spinning ? "Spinning..." : "Pull Lever"}
          </button>
        </div>

        <p className="slot-final-prompt">{promptText}</p>
      </section>
    </main>
  );
}
