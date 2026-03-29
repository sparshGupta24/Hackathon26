"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "idle-audio-muted";

export function IdleAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const a = audioRef.current;
    if (!a) {
      return;
    }
    a.volume = 0.5;
    a.loop = true;
    void a.play().catch(() => {});
    return () => {
      a.pause();
      a.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) {
      return;
    }
    a.muted = muted;
  }, [muted]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
    void audioRef.current?.play().catch(() => {});
  }

  return (
    <>
      <audio ref={audioRef} src="/idle_song.mp3" preload="auto" />
      <button
        type="button"
        className="idle-audio-mute"
        onClick={toggleMute}
        aria-pressed={muted}
        aria-label={muted ? "Unmute idle music" : "Mute idle music"}
      >
        {muted ? "Sound" : "Mute"}
      </button>
    </>
  );
}
