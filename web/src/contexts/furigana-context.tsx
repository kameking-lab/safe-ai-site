"use client";

import {
  useCallback,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "furigana-enabled";
const CHANGE_EVENT = "anzen:furigana-change";
let memoryEnabled = false;
let memoryFallbackActive = false;

interface FuriganaContextValue {
  furiganaEnabled: boolean;
  toggleFurigana: () => void;
}

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (memoryFallbackActive) return memoryEnabled;
  try {
    memoryEnabled = localStorage.getItem(STORAGE_KEY) === "true";
    return memoryEnabled;
  } catch {
    memoryFallbackActive = true;
    return memoryEnabled;
  }
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      memoryEnabled = event.newValue === "true";
      memoryFallbackActive = false;
      listener();
    }
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function FuriganaProvider({ children }: { children: React.ReactNode }) {
  // 後方互換用。状態は外部storeで共有するため、ページ本文をClient境界で包まない。
  return children;
}

export function useFurigana(): FuriganaContextValue {
  const furiganaEnabled = useSyncExternalStore(
    subscribe,
    readEnabled,
    () => false,
  );
  const toggleFurigana = useCallback(() => {
    const next = !readEnabled();
    memoryEnabled = next;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      memoryFallbackActive = false;
    } catch {
      memoryFallbackActive = true;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return { furiganaEnabled, toggleFurigana };
}
