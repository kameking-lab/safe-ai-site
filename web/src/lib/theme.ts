"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "anzen-theme";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemeMode) => void;
  cycleTheme: () => void;
}

const THEME_CHANGE_EVENT = "anzen:theme-change";
let memoryTheme: ThemeMode = "system";
let memoryFallbackActive = false;

function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyHtmlClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  if (memoryFallbackActive) return memoryTheme;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    memoryTheme =
      raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
    return memoryTheme;
  } catch {
    memoryFallbackActive = true;
    return memoryTheme;
  }
}

function readResolvedTheme(): ResolvedTheme {
  const theme = readStoredTheme();
  return theme === "system" ? readSystemTheme() : theme;
}

function subscribeTheme(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      memoryTheme =
        event.newValue === "light" ||
        event.newValue === "dark" ||
        event.newValue === "system"
          ? event.newValue
          : "system";
      memoryFallbackActive = false;
      listener();
    }
  };
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", listener);
  };
}

function setThemeStore(next: ThemeMode): void {
  memoryTheme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    memoryFallbackActive = false;
  } catch {
    memoryFallbackActive = true;
  }
  applyHtmlClass(next === "system" ? readSystemTheme() : next);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 後方互換用。状態は外部storeで共有し、ページ全体をClient境界にしない。
  return children;
}

export function useTheme(): ThemeContextValue {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readStoredTheme,
    () => "system" as ThemeMode,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribeTheme,
    readResolvedTheme,
    () => "light" as ResolvedTheme,
  );
  useEffect(() => applyHtmlClass(resolvedTheme), [resolvedTheme]);
  const setTheme = useCallback((next: ThemeMode) => setThemeStore(next), []);
  const cycleTheme = useCallback(() => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    setThemeStore(order[(order.indexOf(theme) + 1) % order.length]);
  }, [theme]);
  return { theme, resolvedTheme, setTheme, cycleTheme };
}

/**
 * <head> に inject する FOUC 抑止スクリプト本体。
 * hydration 前に <html> へ class="dark" を付与しておく。
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=(s==='dark')||((s===null||s==='system')&&m);var r=document.documentElement;if(d){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(e){}})();`;
