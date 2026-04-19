"use client";

import { useEffect } from "react";

export default function KyErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("KY page error:", error);
  }, [error]);

  const handleResetData = () => {
    try {
      localStorage.removeItem("ky-record");
      localStorage.removeItem("ky-signatures");
      localStorage.removeItem("safe-ai:ky-instruction-record:v1");
      localStorage.removeItem("safe-ai:ky-record-list:v1");
      localStorage.removeItem("safe-ai:ky-paper:v1");
    } catch {}
    reset();
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 shadow-sm">
        <h2 className="text-base font-bold text-rose-900">KY用紙の表示でエラーが発生しました</h2>
        <p className="mt-2 text-sm text-rose-800">
          保存データの形式が古い可能性があります。リセットすると再度表示できます。
        </p>
        <p className="mt-2 break-all text-[11px] text-rose-700">{error.message}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            再試行
          </button>
          <button
            type="button"
            onClick={handleResetData}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            保存データをリセット
          </button>
        </div>
      </div>
    </div>
  );
}
