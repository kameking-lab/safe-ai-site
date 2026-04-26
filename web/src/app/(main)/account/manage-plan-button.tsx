"use client";

import { useState } from "react";

export function ManagePlanButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "ポータルを開けませんでした。時間をおいて再試行してください。");
        return;
      }
      window.location.href = data.url;
      // リダイレクト後もローディングを維持（ユーザーへのフィードバック）
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラーが発生しました。");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        aria-busy={loading}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Stripeへ移動中..." : "プラン管理"}
      </button>
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="flex-1 text-xs leading-5 text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
            aria-label="エラーを閉じる"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
