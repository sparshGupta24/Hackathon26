"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface TrafficLightsProps {
  intervalMs?: number;
  onComplete?: () => void;
  mode?: "start" | "yellow";
}

export function TrafficLights({ intervalMs = 700, onComplete, mode = "start" }: TrafficLightsProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showGoText, setShowGoText] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (mode === "yellow") {
      return;
    }
    const timers: number[] = [];
    const resetTimer = window.setTimeout(() => {
      setActiveIndex(-1);
      setShowGoText(false);
    }, 0);
    timers.push(resetTimer);

    for (let index = 0; index < 5; index += 1) {
      const timer = window.setTimeout(() => {
        setActiveIndex(index);
      }, intervalMs * (index + 1));
      timers.push(timer);
    }

    const lightsOutTimer = window.setTimeout(() => {
      setActiveIndex(-1);
      setShowGoText(true);
    }, intervalMs * 6);
    timers.push(lightsOutTimer);

    const doneTimer = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, intervalMs * 6 + 1200);
    timers.push(doneTimer);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [intervalMs, mode]);

  const lights = useMemo(() => {
    if (mode === "yellow") {
      return Array.from({ length: 5 }, () => true);
    }
    return Array.from({ length: 5 }, (_, index) => index <= activeIndex);
  }, [activeIndex, mode]);

  return (
    <div className="traffic-lights-panel">
      <div className="traffic-rig" role="img" aria-label="F1 start lights sequence">
        {lights.map((isOn, index) => (
          <div className="traffic-lamp-wrap" style={{ animationDelay: `${index * 120}ms` }} key={index}>
            <div className={isOn ? `traffic-lamp ${mode === "yellow" ? "yellow" : "on"}` : "traffic-lamp"} />
          </div>
        ))}
      </div>
      {mode === "yellow" ? <p className="muted traffic-caption">SAFETY CAR</p> : null}
      {mode === "start" && showGoText ? <p className="lights-out-text">LIGHTS OUT AND AWAY WE GO</p> : null}
    </div>
  );
}
