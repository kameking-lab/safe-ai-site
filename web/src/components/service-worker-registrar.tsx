"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribeToNetworkState(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getNetworkSnapshot() {
  return !navigator.onLine;
}

export function ServiceWorkerRegistrar({
  enabled = true,
  showNetworkStatus = true,
}: {
  enabled?: boolean;
  showNetworkStatus?: boolean;
}) {
  // server snapshot は常に online(false)。初期client renderも同じ値を使い、
  // hydration完了後に実際の navigator.onLine へ同期するため、offline起動でも
  // ルートlayout全体をhydration mismatchで失わない。
  const isOffline = useSyncExternalStore(
    subscribeToNetworkState,
    getNetworkSnapshot,
    () => false,
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!enabled) {
      // Previewのbranch URLを再利用しても旧workerを残さない。originが異なる
      // productionのregistration/cacheにはブラウザー仕様上アクセスできない。
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .then(async () => {
          if (!("caches" in window)) return;
          const keys = await window.caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith("anzen-ai-"))
              .map((key) => window.caches.delete(key)),
          );
        })
        .catch(() => undefined);
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => {
        console.warn("[SW] registration failed:", err);
      });
  }, [enabled]);

  if (!isOffline || !showNetworkStatus) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-lg"
    >
      <WifiOff className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />オフラインモード
    </div>
  );
}
