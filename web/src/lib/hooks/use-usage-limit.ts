"use client";

import { useCallback, useState } from "react";

interface UsageConfig {
  key: string;
  limit: number;
  /** "day" = resets at midnight; "session" = in-memory only */
  period: "day" | "session";
}

interface UsageState {
  count: number;
  isExceeded: boolean;
  increment: () => void;
  reset: () => void;
}

function getTodayKey(baseKey: string): string {
  const today = new Date().toISOString().split("T")[0]!;
  return `${baseKey}_${today}`;
}

function readCount(storageKey: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(storageKey);
  return raw ? (parseInt(raw, 10) || 0) : 0;
}

export function useUsageLimit({ key, limit, period }: UsageConfig): UsageState {
  const storageKey = period === "day" ? getTodayKey(key) : null;

  const [count, setCount] = useState<number>(() => {
    if (period === "session") return 0;
    return readCount(getTodayKey(key));
  });

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(storageKey, String(next));
      }
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    setCount(0);
    if (storageKey && typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return { count, isExceeded: count >= limit, increment, reset };
}
