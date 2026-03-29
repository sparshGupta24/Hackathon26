"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrafficLights } from "@/components/TrafficLights";
import { useEventState } from "@/lib/useEventState";

const TRACK_POINTS = [
  { x: 252, y: 522 },
  { x: 226, y: 472 },
  { x: 220, y: 390 },
  { x: 260, y: 278 },
  { x: 360, y: 210 },
  { x: 550, y: 210 },
  { x: 702, y: 290 },
  { x: 750, y: 390 },
  { x: 930, y: 430 },
  { x: 1108, y: 486 },
  { x: 1200, y: 640 },
  { x: 1138, y: 772 },
  { x: 1008, y: 828 },
  { x: 796, y: 828 },
  { x: 658, y: 754 },
  { x: 592, y: 650 },
  { x: 500, y: 610 },
  { x: 322, y: 610 },
  { x: 250, y: 560 },
  { x: 252, y: 522 }
];

function getTrackPoint(progress: number) {
  const ratio = Math.max(0, Math.min(1, progress / 100));
  const segments = TRACK_POINTS.length - 1;
  const scaled = ratio * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const t = scaled - index;
  const start = TRACK_POINTS[index];
  const end = TRACK_POINTS[index + 1];
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  };
}

interface ArenaStage {
  title: string;
  subtitle: string;
  kind: "timed" | "text";
  durationSec?: number;
}

const EVENT_STAGES: ArenaStage[] = [
  { title: "Team registration", subtitle: "Confirm all teams and livery setup.", kind: "text" },
  { title: "Timed Session 1: Pre prompt", subtitle: "Plan strategy before prompts drop.", kind: "timed", durationSec: 60 },
  { title: "Regulatory check", subtitle: "Mini presentation and compliance check.", kind: "text" },
  { title: "Timed Session 2: Start building", subtitle: "Begin implementation sprint.", kind: "timed", durationSec: 60 },
  { title: "Regulatory check 2", subtitle: "Review current progress and blockers.", kind: "text" },
  { title: "Pit closure", subtitle: "Tea time.", kind: "text" },
  { title: "Timed Session 3: Start building 2", subtitle: "Continue build sprint with fixes.", kind: "timed", durationSec: 60 },
  { title: "End of Day 1", subtitle: "Wrap-up and prepare for next phase.", kind: "text" },
  { title: "Bingo", subtitle: "Quick activity before final run.", kind: "text" },
  { title: "Timed Session 4: Start building 3", subtitle: "Final main build window.", kind: "timed", durationSec: 60 },
  { title: "Regulatory check", subtitle: "Mini presentation checkpoint.", kind: "text" },
  { title: "Timed Session 4: Fine tuning", subtitle: "Polish and optimize the solution.", kind: "timed", durationSec: 60 },
  { title: "Regulatory check", subtitle: "Final compliance review.", kind: "text" },
  { title: "Showdown", subtitle: "Present and battle-test all teams.", kind: "text" },
  { title: "Winners", subtitle: "Celebrate top teams and close event.", kind: "text" }
];

export default function ArenaPage() {
  const { data } = useEventState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<"stage_text" | "stage_start" | "running" | "paused" | "ended">(
    EVENT_STAGES[0].kind === "timed" ? "stage_start" : "stage_text"
  );
  const [remainingSec, setRemainingSec] = useState(EVENT_STAGES[0].durationSec ?? 60);
  const [showCircuit, setShowCircuit] = useState(false);
  const [extendingMinutes, setExtendingMinutes] = useState<5 | 10 | null>(null);
  const [liveNotifications, setLiveNotifications] = useState<
    Array<{
      id: string;
      teamName: string;
      message: string;
      delta: number;
      accentColor: string;
    }>
  >([]);
  const timeoutMapRef = useRef<Map<string, number>>(new Map());
  const seenUpdateRef = useRef<string | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const teams = data?.teams ?? [];

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;
    return () => {
      timeoutMap.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      timeoutMap.clear();
    };
  }, []);

  useEffect(() => {
    if (!data?.raceUpdate) {
      return;
    }

    const { updatedAt, teamName, message, delta, accentColor } = data.raceUpdate;
    if (!updatedAt || seenUpdateRef.current === updatedAt) {
      return;
    }
    seenUpdateRef.current = updatedAt;

    window.setTimeout(() => {
      setLiveNotifications((prev) => [
        {
          id: updatedAt,
          teamName,
          message,
          delta,
          accentColor
        },
        ...prev
      ].slice(0, 2));
    }, 0);

    if (!notificationAudioRef.current) {
      notificationAudioRef.current = new Audio("/f1_radio.mp3");
      notificationAudioRef.current.volume = 0.85;
    }
    notificationAudioRef.current.currentTime = 0;
    void notificationAudioRef.current.play().catch(() => {});

    const existingTimer = timeoutMapRef.current.get(updatedAt);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }
    const timerId = window.setTimeout(() => {
      setLiveNotifications((prev) => prev.filter((entry) => entry.id !== updatedAt));
      timeoutMapRef.current.delete(updatedAt);
    }, 8000);
    timeoutMapRef.current.set(updatedAt, timerId);
  }, [data?.raceUpdate]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }
    const interval = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setPhase("ended");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  const stage = EVENT_STAGES[stageIndex];
  const isTimedStage = stage.kind === "timed";
  const hasNextStage = stageIndex < EVENT_STAGES.length - 1;

  function completeLightsAndStartTimer() {
    setPhase("running");
  }

  function resumeFromSafetyCar() {
    if (remainingSec <= 0) {
      setPhase("ended");
      return;
    }
    setPhase("running");
  }

  function pauseTimer() {
    setPhase("paused");
  }

  async function extendTimer(minutes: 5 | 10) {
    setExtendingMinutes(minutes);
    setRemainingSec((prev) => prev + minutes * 60);
    setExtendingMinutes(null);
  }

  function goToNextStage() {
    if (!hasNextStage) {
      return;
    }
    const nextIndex = Math.min(stageIndex + 1, EVENT_STAGES.length - 1);
    const nextStage = EVENT_STAGES[nextIndex];
    setStageIndex(nextIndex);
    if (nextStage.kind === "timed") {
      setRemainingSec(nextStage.durationSec ?? 60);
      setPhase("stage_start");
    } else {
      setPhase("stage_text");
    }
    setExtendingMinutes(null);
  }

  function skipToNextStage() {
    goToNextStage();
  }

  const timerLabel = useMemo(() => {
    const mins = Math.floor(remainingSec / 60)
      .toString()
      .padStart(2, "0");
    const secs = (remainingSec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }, [remainingSec]);

  const isEnded = phase === "ended";
  const showStartLights = phase === "stage_start";
  const showSafetyLights = phase === "paused";
  const showTimer = phase === "running" || phase === "paused";
  const canShowTimedNextCTA = isTimedStage && isEnded;
  const canShowTextNextCTA = !isTimedStage;

  return (
    <main className="page-shell arena-shell">
      <header className="hero compact arena-brief">
        <div>
          <p className="kicker">PIXEL PRIX 2026, BENGALURU</p>
          <h1>{stage.title}</h1>
          <p className="muted stage-subtitle">{stage.subtitle}</p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn-secondary">
            Back To Registration
          </Link>
          <Link href="/prompt-generator" className="btn-primary">
            Prompt Generator
          </Link>
          <button className="btn-secondary" type="button" onClick={() => setShowCircuit((prev) => !prev)}>
            {showCircuit ? "Hide Circuit" : "View Circuit"}
          </button>
        </div>
      </header>

      <>
        {showStartLights ? <TrafficLights mode="start" onComplete={completeLightsAndStartTimer} /> : null}
        {showSafetyLights ? (
          <>
            <TrafficLights mode="yellow" />
            <button className="btn-primary" type="button" onClick={() => void resumeFromSafetyCar()}>
              Resume Race
            </button>
          </>
        ) : null}
        <section className={`race-main ${showCircuit ? "with-circuit" : ""}`}>
          <section className="timer-stage">
            {isTimedStage && hasNextStage ? (
              <button className="skip-stage-btn" type="button" onClick={skipToNextStage}>
                Skip to next
              </button>
            ) : null}
            {liveNotifications.length ? (
              <section className="radio-stack" aria-label="Live radio notifications">
                {liveNotifications.map((raceUpdate, index) => {
                  const raceUpdateSubtext =
                    raceUpdate.delta !== 0
                      ? raceUpdate.delta > 0
                        ? "Gaining positions on track"
                        : "Losing positions on track"
                      : "Holding current position";
                  return (
                    <aside
                      key={raceUpdate.id}
                      className={`radio-note ${index === 0 ? "radio-note-current" : "radio-note-older"}`}
                      style={{ ["--radio-accent" as string]: raceUpdate.accentColor }}
                    >
                      <div className="radio-note-head">
                        <p className="radio-note-team">{raceUpdate.teamName}</p>
                        <p className="radio-note-label">RADIO</p>
                      </div>
                      <div className="radio-wave" aria-hidden="true">
                        {Array.from({ length: 18 }).map((_, barIndex) => (
                          <span key={`${raceUpdate.id}-wave-${barIndex}`} style={{ animationDelay: `${barIndex * 55}ms` }} />
                        ))}
                      </div>
                      <p className="radio-note-message">&ldquo;{raceUpdate.message}&rdquo;</p>
                      <p className="radio-note-sub">{raceUpdateSubtext}</p>
                    </aside>
                  );
                })}
              </section>
            ) : null}
            {showTimer ? <div className={`race-clock ${remainingSec <= 10 ? "urgent" : ""} ${phase === "paused" ? "timer-paused" : ""}`}>{timerLabel}</div> : null}
            {showTimer && !isEnded && isTimedStage ? (
              <div className="timer-actions arena-controls">
                <button className="btn-secondary" type="button" onClick={() => void pauseTimer()} disabled={phase !== "running"}>
                  Pause Timer
                </button>
                <button className="btn-secondary" type="button" onClick={() => void extendTimer(5)} disabled={extendingMinutes !== null}>
                  {extendingMinutes === 5 ? "Adding..." : "+5 min"}
                </button>
                <button className="btn-secondary" type="button" onClick={() => void extendTimer(10)} disabled={extendingMinutes !== null}>
                  {extendingMinutes === 10 ? "Adding..." : "+10 min"}
                </button>
              </div>
            ) : null}
            {canShowTimedNextCTA ? (
              <div className="stage-next-wrap">
                <div className="checkered-banner" />
                <p className="checkered-caption">End of the session</p>
                <button className="btn-primary" type="button" onClick={goToNextStage}>
                  Next Stage
                </button>
              </div>
            ) : null}
            {canShowTextNextCTA ? (
              <div className="stage-text-card">
                <p className="muted">Stage {stageIndex + 1} of {EVENT_STAGES.length}</p>
                <h2>{stage.title}</h2>
                <p>{stage.subtitle}</p>
                {hasNextStage ? (
                  <button className="btn-primary" type="button" onClick={goToNextStage}>
                    Next Stage
                  </button>
                ) : (
                  <Link className="btn-primary" href="/">
                    Back to Registration
                  </Link>
                )}
              </div>
            ) : null}
          </section>

          {showCircuit && (showTimer || isEnded) ? (
            <aside className="circuit-side-card" aria-label="Circuit map panel">
              <p className="kicker">Circuit</p>
              <div className="map-wrap circuit-map-wrap">
                <Image src="/circuit-placeholder.svg" alt="Circuit map" width={1400} height={880} className="map-image" priority />
                {teams.map((team, index) => {
                  const point = getTrackPoint(team.progress);
                  return (
                    <div
                      className="start-marker-on-track"
                      key={team.id}
                      style={{
                        left: `${(point.x / 1400) * 100}%`,
                        top: `${(point.y / 880) * 100}%`,
                        transform: `translate(-50%, -50%) translateY(${index * 2}px)`
                      }}
                    >
                      <span
                        className="start-marker-dot"
                        style={{ backgroundColor: team.livery?.primaryColor ?? "#FFFFFF" }}
                        aria-hidden="true"
                      />
                      <span className="start-marker-name">{team.name}</span>
                    </div>
                  );
                })}
              </div>
              {!teams.length ? <p className="start-marker-empty">No teams registered yet</p> : null}
            </aside>
          ) : null}
        </section>
      </>
    </main>
  );
}
