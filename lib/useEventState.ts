"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventStateResponse } from "@/lib/types";

/**
 * Loads `/api/state` once on mount, optionally on tab focus, and optionally on an interval.
 * Pass `pollIntervalMs` only when a screen truly needs periodic sync (e.g. arena clock);
 * omit it to avoid Firestore quota burn from polling every few seconds.
 */
export function useEventState(enabled = true, pollIntervalMs: number | null = null) {
  const [data, setData] = useState<EventStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load event state");
      }
      const payload = (await response.json()) as EventStateResponse;
      setData(payload);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load state");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void refresh();

    const intervalMs = typeof pollIntervalMs === "number" && pollIntervalMs > 0 ? pollIntervalMs : 0;
    const timer =
      intervalMs > 0
        ? window.setInterval(() => {
            void refresh();
          }, intervalMs)
        : null;

    return () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [enabled, pollIntervalMs, refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, refresh]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
