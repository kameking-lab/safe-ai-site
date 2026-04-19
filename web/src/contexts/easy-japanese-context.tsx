"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

const STORAGE_KEY = "easy-japanese-enabled";

interface EasyJapaneseContextValue {
  easyJapaneseEnabled: boolean;
  toggleEasyJapanese: () => void;
}

const EasyJapaneseContext = createContext<EasyJapaneseContextValue | null>(null);

export function EasyJapaneseProvider({ children }: { children: React.ReactNode }) {
  // SSR/hydration対策: 初期値はfalseで統一し、マウント後にlocalStorageから読む
  const [easyJapaneseEnabled, setEasyJapaneseEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") setEasyJapaneseEnabled(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleEasyJapanese = useCallback(() => {
    setEasyJapaneseEnabled((prev) => {
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
    <EasyJapaneseContext.Provider value={{ easyJapaneseEnabled, toggleEasyJapanese }}>
      {children}
    </EasyJapaneseContext.Provider>
  );
}

export function useEasyJapanese(): EasyJapaneseContextValue {
  const ctx = useContext(EasyJapaneseContext);
  if (!ctx) {
    throw new Error("useEasyJapanese must be used within EasyJapaneseProvider");
  }
  return ctx;
}
