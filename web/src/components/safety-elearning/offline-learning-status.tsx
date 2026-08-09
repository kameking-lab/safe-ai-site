"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

export function OfflineLearningStatus() {
  const online = useSyncExternalStore(subscribe, getOnlineSnapshot, () => true);
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex items-start gap-3 rounded-xl border-2 border-amber-700 bg-amber-50 p-4 font-bold leading-6 text-amber-950 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
    >
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>オフライン中です。問題演習は利用できます。外部の公式根拠リンクは接続後に確認してください。</p>
    </div>
  );
}
