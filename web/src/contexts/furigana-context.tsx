"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

const STORAGE_KEY = "furigana-enabled";

interface FuriganaContextValue {
  furiganaEnabled: boolean;
  toggleFurigana: () => void;
}

const FuriganaContext = createContext<FuriganaContextValue | null>(null);

export function FuriganaProvider({ children }: { children: React.ReactNode }) {
  // SSR/hydration対策: 初期値はfalseで統一し、マウント後にlocalStorageから読む
  const [furiganaEnabled, setFuriganaEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
      if (localStorage.getItem(STORAGE_KEY) === "true") setFuriganaEnabled(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

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
