"use client";

import { useSyncExternalStore, useState } from "react";
import { HardDrive, X } from "lucide-react";

const DISMISSED_KEY = "safe-ai:local-storage-warning-dismissed:v1";

function subscribe(_callback: () => void) {
  return () => {};
}

function getVisibleSnapshot(): boolean {
  try {
    return !localStorage.getItem(DISMISSED_KEY);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function LocalStorageWarningBanner() {
  const storedVisible = useSyncExternalStore(subscribe, getVisibleSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  if (!storedVisible || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 print:hidden"
    >
      <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <p className="flex-1 text-xs leading-5 text-amber-800">
        <span className="font-bold">データはこのブラウザのみに保存されます。</span>
        ブラウザのキャッシュ・履歴を削除すると記録が消えます。
        定期的に「エクスポート」で JSON バックアップを取ってください。
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="rounded p-0.5 text-amber-600 hover:bg-amber-100"
        aria-label="警告を閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
