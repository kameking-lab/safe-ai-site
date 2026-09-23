"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "anzen-ai:scroll:";

function currentStorageKey() {
  return `${STORAGE_PREFIX}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function ScrollPositionRestorer() {
  const pathname = usePathname();
  const activeKey = useRef("");

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    activeKey.current = currentStorageKey();
    const save = () => {
      try {
        window.sessionStorage.setItem(
          activeKey.current,
          String(Math.max(0, window.scrollY)),
        );
      } catch {
        // Storage may be unavailable. Browser navigation still works without enhancement.
      }
    };
    const restoreHistoryEntry = () => {
      save();
      const key = currentStorageKey();
      activeKey.current = key;
      let saved = 0;
      try {
        saved = Number(window.sessionStorage.getItem(key) ?? 0);
      } catch {
        saved = 0;
      }
      if (Number.isFinite(saved) && saved > 0) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() =>
            window.scrollTo({ top: saved, left: 0 }),
          );
        });
      }
    };
    window.addEventListener("popstate", restoreHistoryEntry);
    window.addEventListener("hashchange", restoreHistoryEntry);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("popstate", restoreHistoryEntry);
      window.removeEventListener("hashchange", restoreHistoryEntry);
      window.removeEventListener("pagehide", save);
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    activeKey.current = currentStorageKey();
  }, [pathname]);

  return null;
}
