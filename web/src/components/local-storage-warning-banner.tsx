"use client";

import { useState } from "react";
import { HardDrive, X } from "lucide-react";

const DISMISSED_KEY = "safe-ai:local-storage-warning-dismissed:v1";

function getInitialDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(localStorage.getItem(DISMISSED_KEY));
  } catch {
    return false;
  }
}

export function LocalStorageWarningBanner() {
  const [dismissed, setDismissed] = useState<boolean>(getInitialDismissed);

  if (dismissed) return null;

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
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 print:hidden"
    >
      <HardDrive className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="flex-1 leading-5">
        入力データはこのブラウザにのみ保存されます。重要な記録はエクスポート（JSON）でバックアップしてください。
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
        aria-label="閉じる"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
