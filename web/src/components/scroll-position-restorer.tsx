"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PRESERVE_NAVIGATION_SCROLL } from "@/lib/preserve-navigation-scroll";

const STORAGE_PREFIX = "anzen-ai:scroll:";

function currentStorageKey() {
  return `${STORAGE_PREFIX}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function ScrollPositionRestorer() {
  const pathname = usePathname();
  const activeKey = useRef("");
  const navigationStarted = useRef(false);
  const pendingRestoreKey = useRef("");

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    activeKey.current = currentStorageKey();
    const save = () => {
      if (navigationStarted.current || !activeKey.current) return;
      try {
        window.sessionStorage.setItem(
          activeKey.current,
          String(Math.max(0, window.scrollY)),
        );
      } catch {
        // Storage may be unavailable. Browser navigation still works without enhancement.
      }
    };
    // Next.js client transitions do not trigger pagehide. Persist the current
    // position before its default scroll-to-top can overwrite the old route.
    const saveBeforeLink = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash === window.location.hash) return;
      save();
      navigationStarted.current = true;
      if (destination.pathname === "/") {
        pendingRestoreKey.current = `${STORAGE_PREFIX}/`;
      }
    };
    const saveOnScroll = () => save();
    const saveBeforeClientNavigation = () => {
      save();
      navigationStarted.current = true;
    };
    const restoreHistoryEntry = () => {
      save();
      const key = currentStorageKey();
      pendingRestoreKey.current = key;
      navigationStarted.current = true;
      activeKey.current = key;
      let saved = 0;
      try {
        saved = Number(window.sessionStorage.getItem(key) ?? 0);
      } catch {
        saved = 0;
      }
      if (Number.isFinite(saved) && saved >= 0) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() =>
            window.scrollTo({ top: saved, left: 0 }),
          );
        });
      }
    };
    document.addEventListener("click", saveBeforeLink, true);
    window.addEventListener(PRESERVE_NAVIGATION_SCROLL, saveBeforeClientNavigation);
    window.addEventListener("scroll", saveOnScroll, { passive: true });
    window.addEventListener("popstate", restoreHistoryEntry);
    window.addEventListener("hashchange", restoreHistoryEntry);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      document.removeEventListener("click", saveBeforeLink, true);
      window.removeEventListener(PRESERVE_NAVIGATION_SCROLL, saveBeforeClientNavigation);
      window.removeEventListener("scroll", saveOnScroll);
      window.removeEventListener("popstate", restoreHistoryEntry);
      window.removeEventListener("hashchange", restoreHistoryEntry);
      window.removeEventListener("pagehide", save);
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const key = currentStorageKey();
    activeKey.current = key;
    if (pendingRestoreKey.current === key) {
      let saved = 0;
      try {
        saved = Number(window.sessionStorage.getItem(key) ?? 0);
      } catch {
        saved = 0;
      }
      if (Number.isFinite(saved) && saved >= 0) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          window.scrollTo({ top: saved, left: 0 });
          pendingRestoreKey.current = "";
          navigationStarted.current = false;
        }));
        return;
      }
    }
    navigationStarted.current = false;
  }, [pathname]);

  return null;
}
