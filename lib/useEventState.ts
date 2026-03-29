"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventStateResponse } from "@/lib/types";

export function useEventState(enabled = true, pollIntervalMs = 10_000) {
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
    const timer = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, pollIntervalMs, refresh]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
