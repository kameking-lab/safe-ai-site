"use client";

import { useEffect } from "react";
import type { JmaEarthquake } from "@/lib/jma/jma-data";

type Props = {
  earthquake: JmaEarthquake | null;
  onClose: () => void;
};

export function EarthquakeAlertModal({ earthquake, onClose }: Props) {
  useEffect(() => {
    if (!earthquake) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [earthquake, onClose]);

  if (!earthquake) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="earthquake-alert-title"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-rose-500 bg-rose-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <h2 id="earthquake-alert-title" className="text-xl font-extrabold text-rose-100">
            🚨 地震速報
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-rose-300 px-2 py-1 text-xs font-bold text-rose-100 hover:bg-rose-900"
          >
            閉じる
          </button>
        </div>
        <div className="mt-3 space-y-1 text-rose-50">
          <p className="text-sm">
            最大震度 <span className="text-2xl font-extrabold">{earthquake.maxIntensity ?? "—"}</span>
            {earthquake.magnitude ? <span className="ml-2 text-sm">/ M{earthquake.magnitude}</span> : null}
          </p>
          <p className="text-base font-semibold">震源地: {earthquake.hypocenter ?? "不明"}</p>
          <p className="text-xs text-rose-200">
            発生: {earthquake.occurredAt ?? earthquake.reportDatetime ?? "—"}
          </p>
          {earthquake.depth ? <p className="text-xs text-rose-200">深さ: {earthquake.depth}</p> : null}
        </div>
        <p className="mt-4 rounded border border-rose-300/60 bg-rose-900/60 p-2 text-[11px] text-rose-100">
          身の安全を確保し、揺れがおさまるまで待機してください。エレベーター・足場上での作業は直ちに中止。
        </p>
        <p className="mt-2 text-[10px] text-rose-300">出典：気象庁</p>
      </div>
    </div>
  );
}
