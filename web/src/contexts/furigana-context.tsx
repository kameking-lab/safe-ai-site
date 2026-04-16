"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

const STORAGE_KEY = "furigana-enabled";

interface FuriganaContextValue {
  furiganaEnabled: boolean;
  toggleFurigana: () => void;
}

const FuriganaContext = createContext<FuriganaContextValue | null>(null);

function readStoredFurigana(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function FuriganaProvider({ children }: { children: React.ReactNode }) {
  // lazily initialize from localStorage to avoid cascading re-render
  const [furiganaEnabled, setFuriganaEnabled] = useState<boolean>(readStoredFurigana);

  const toggleFurigana = useCallback(() => {
    setFuriganaEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage利用不可の場合は無視
      }
      return next;
    });
  }, []);

  return (
    <FuriganaContext.Provider value={{ furiganaEnabled, toggleFurigana }}>
      {children}
    </FuriganaContext.Provider>
  );
}

export function useFurigana(): FuriganaContextValue {
  const ctx = useContext(FuriganaContext);
  if (!ctx) {
    throw new Error("useFurigana must be used within FuriganaProvider");
  }
  return ctx;
}
