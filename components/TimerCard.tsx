"use client";

import { useEffect, useMemo, useState } from "react";
import { formatTimerLabel, getRemainingSeconds } from "@/lib/timer";
import type { TimerState } from "@/lib/types";

interface TimerCardProps {
  timer: TimerState;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

function statusText(status: TimerState["status"]) {
  if (status === "idle") return "Waiting to start";
  if (status === "running") return "Running";
  return "Completed";
}

export function TimerCard({ timer, title, children, className }: TimerCardProps) {
  const [tickMs, setTickMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setTickMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = useMemo(
    () => getRemainingSeconds({ ...timer, startedAt: timer.startedAt }, tickMs),
    [tickMs, timer]
  );

  return (
    <section className={className ? `timer-card ${className}` : "timer-card"}>
      <div className="timer-head">
        <h2>{title}</h2>
        <span className={`pill ${timer.status}`}>{statusText(timer.status)}</span>
      </div>
      <div className="timer-value">{formatTimerLabel(remaining)}</div>
      <p className="muted">
        Base: {Math.round(timer.baseDurationSec / 60)} min | Extensions: +{Math.round(timer.extendedSec / 60)} min
      </p>
      {children}
    </section>
  );
}
