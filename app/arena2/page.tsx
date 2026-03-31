"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EventRunFlowNav } from "@/components/EventRunFlowNav";
import { TrafficLights } from "@/components/TrafficLights";
import { formatTimerLabel } from "@/lib/timer";
import { EventBrandLogos } from "@/components/EventBrandLogos";
import { useEventState } from "@/lib/useEventState";

/** Building Session #2 — 60 minutes on the local countdown. */
const ARENA2_BASE_DURATION_SEC = 60 * 60;

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

type LocalPhase = "ceremony" | "running" | "paused" | "ended";

export default function Arena2Page() {
  const { data, loading, error, refresh } = useEventState(true, 5_000);
  const [showCircuit, setShowCircuit] = useState(false);

  const [ceremonyKey, setCeremonyKey] = useState(0);
  const [phase, setPhase] = useState<LocalPhase>("ceremony");
  const [sessionSeconds, setSessionSeconds] = useState(ARENA2_BASE_DURATION_SEC);
  const [remainingSec, setRemainingSec] = useState(ARENA2_BASE_DURATION_SEC);

  const sessionSecondsRef = useRef(sessionSeconds);
  sessionSecondsRef.current = sessionSeconds;

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
  const radioSessionReadyRef = useRef(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastRadioChimeRef = useRef<{ updatedAt: string; at: number } | null>(null);
  const teams = data?.teams ?? [];

  useEffect(() => {
    document.body.classList.add("arena-static-bg");
    return () => {
      document.body.classList.remove("arena-static-bg");
    };
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }
    const id = window.setInterval(() => {
      setRemainingSec((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && remainingSec === 0) {
      setPhase("ended");
    }
  }, [phase, remainingSec]);

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;
    return () => {
      timeoutMap.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      timeoutMap.clear();
    };
  }, []);

  const raceSignature = useMemo(() => {
    const r = data?.raceUpdate;
    if (!r?.updatedAt) {
      return "";
    }
    return [r.updatedAt, r.teamId ?? "", r.message, String(r.delta)].join("\0");
  }, [data?.raceUpdate?.updatedAt, data?.raceUpdate?.teamId, data?.raceUpdate?.message, data?.raceUpdate?.delta]);

  useEffect(() => {
    if (!raceSignature || !data?.raceUpdate) {
      return;
    }

    const { updatedAt, teamName, message, delta, accentColor } = data.raceUpdate;

    if (!radioSessionReadyRef.current) {
      radioSessionReadyRef.current = true;
      seenUpdateRef.current = raceSignature;
      return;
    }

    if (seenUpdateRef.current === raceSignature) {
      return;
    }
    seenUpdateRef.current = raceSignature;

    window.setTimeout(() => {
      setLiveNotifications((prev) =>
        [
          {
            id: updatedAt,
            teamName,
            message,
            delta,
            accentColor
          },
          ...prev
        ].slice(0, 2)
      );
    }, 0);

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const prevChime = lastRadioChimeRef.current;
    const chimeDedupMs = 900;
    const shouldPlayChime =
      !prevChime || prevChime.updatedAt !== updatedAt || now - prevChime.at >= chimeDedupMs;

    if (shouldPlayChime) {
      lastRadioChimeRef.current = { updatedAt, at: now };
      if (!notificationAudioRef.current) {
        notificationAudioRef.current = new Audio("/f1_radio.mp3");
        notificationAudioRef.current.volume = 0.85;
      }
      const audio = notificationAudioRef.current;
      audio.pause();
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }

    const existingTimer = timeoutMapRef.current.get(updatedAt);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }
    const timerId = window.setTimeout(() => {
      setLiveNotifications((prev) => prev.filter((entry) => entry.id !== updatedAt));
      timeoutMapRef.current.delete(updatedAt);
    }, 8000);
    timeoutMapRef.current.set(updatedAt, timerId);
  }, [raceSignature]);

  const onLightsComplete = useCallback(() => {
    setRemainingSec(sessionSecondsRef.current);
    setPhase("running");
  }, []);

  const skipToNextStage = useCallback(() => {
    if (phase === "ceremony") {
      setRemainingSec(sessionSecondsRef.current);
      setPhase("running");
    } else if (phase === "running") {
      setPhase("ended");
    } else if (phase === "paused") {
      setPhase("ended");
    }
  }, [phase]);

  function addMinutes(minutes: 5 | 10) {
    const add = minutes * 60;
    if (phase === "ceremony") {
      setSessionSeconds((s) => s + add);
      setRemainingSec((r) => r + add);
    } else if (phase === "running" || phase === "paused") {
      setRemainingSec((r) => r + add);
      setSessionSeconds((s) => s + add);
    }
  }

  function pauseLocalTimer() {
    setPhase("paused");
  }

  function resumeLocalTimer() {
    setPhase("running");
  }

  function resetLocalSession() {
    setPhase("ceremony");
    setSessionSeconds(ARENA2_BASE_DURATION_SEC);
    setRemainingSec(ARENA2_BASE_DURATION_SEC);
    setCeremonyKey((k) => k + 1);
  }

  const clockSeconds = phase === "ceremony" ? sessionSeconds : remainingSec;
  const timerLabel = useMemo(() => formatTimerLabel(clockSeconds), [clockSeconds]);

  const showStartLights = phase === "ceremony";
  const showPaused = phase === "paused";
  const showRunning = phase === "running";
  const showEnded = phase === "ended";
  const showBigClock = showRunning || showPaused || showEnded;
  const circuitActive = showCircuit && (showRunning || showPaused || showEnded);
  const showSkipControl = phase === "ceremony" || phase === "running" || phase === "paused";

  return (
    <main className="page-shell arena-shell">
      <header className="hero compact arena-brief">
        <div className="arena-brief-main">
          <EventRunFlowNav current="arena" />
          <div className="arena-header-logo-wrap">
            <EventBrandLogos variant="arena" />
          </div>
          <h1>Building Session #2</h1>
          <button
            className="btn-secondary arena-header-circuit"
            type="button"
            onClick={() => setShowCircuit((prev) => !prev)}
          >
            {showCircuit ? "Hide circuit" : "View circuit"}
          </button>
        </div>
      </header>

      {showSkipControl ? (
        <button
          type="button"
          className="arena-skip-stage"
          onClick={skipToNextStage}
          aria-label={phase === "ceremony" ? "Skip start lights and begin timer" : "Skip to session complete"}
        >
          Skip
        </button>
      ) : null}

      <section className={`race-main arena-race-main ${showCircuit ? "with-circuit" : ""}`}>
        <section className="timer-stage arena-race-hub">
          {showStartLights ? (
            <TrafficLights key={ceremonyKey} mode="start" intervalMs={1000} onComplete={onLightsComplete} />
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

          {showBigClock ? (
            <div className="arena-timer-column">
              <div className="arena-timer-anchor">
                <div className={`arena-clock-stack ${showPaused ? "arena-clock-stack--paused" : ""}`}>
                  <div
                    className={`race-clock arena-race-clock ${clockSeconds <= 10 && showRunning ? "urgent" : ""}`}
                  >
                    {timerLabel}
                  </div>
                </div>
                {showPaused ? (
                  <div
                    className="arena-pause-band"
                    role="group"
                    aria-label="Session paused — safety car period"
                  >
                    <div className="arena-pause-band__stripe arena-pause-band__stripe--top" aria-hidden />
                    <div className="arena-pause-band__body">
                      <TrafficLights mode="yellow" />
                      <button className="btn-primary arena-pause-band__resume" type="button" onClick={resumeLocalTimer}>
                        Resume race
                      </button>
                    </div>
                    <div className="arena-pause-band__stripe arena-pause-band__stripe--bottom" aria-hidden />
                  </div>
                ) : null}
                {showEnded ? (
                  <div className="arena-end-band" role="status" aria-live="polite">
                    <div className="arena-end-band__stripe arena-end-band__stripe--top" aria-hidden />
                    <div className="arena-end-band__body">
                      <Image
                        src="/chequeredflag.png"
                        alt=""
                        width={160}
                        height={100}
                        className="arena-end-band__flag"
                        priority
                      />
                      <p className="arena-end-band__caption">SESSION COMPLETE</p>
                      <Link className="btn-primary arena-end-band__next" href="/endofday1">
                        Next
                      </Link>
                    </div>
                    <div className="arena-end-band__stripe arena-end-band__stripe--bottom" aria-hidden />
                  </div>
                ) : null}
              </div>
              {showEnded ? (
                <button type="button" className="btn-secondary arena-ended-new-session" onClick={resetLocalSession}>
                  New session
                </button>
              ) : null}
            </div>
          ) : null}

          {showRunning ? (
            <div className="timer-actions arena-controls">
              <button type="button" className="btn-secondary" onClick={pauseLocalTimer}>
                Pause timer
              </button>
              <button type="button" className="btn-secondary" onClick={() => addMinutes(5)}>
                +5 min
              </button>
              <button type="button" className="btn-secondary" onClick={() => addMinutes(10)}>
                +10 min
              </button>
            </div>
          ) : null}

          {loading && !data ? (
            <p className="muted arena-hydrating">Loading team data for the circuit…</p>
          ) : null}
          {!loading && !data ? (
            <div className="panel admin-state-fallback arena-state-fallback">
              <p className="error-text">{error ?? "Could not load team data."}</p>
              <p className="muted small">The session timer above still works. Retry to load the circuit map.</p>
              <button type="button" className="btn-primary" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : null}
        </section>

        {circuitActive ? (
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
    </main>
  );
}
