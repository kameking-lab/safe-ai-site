"use client";

import { useState } from "react";

interface Props {
  planName: string;
  priceId: string;
  label: string;
  variant: "amber" | "blue";
}

export function PricingCheckout({ planName, priceId, label, variant }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnClass =
    variant === "amber"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  async function handleClick() {
    if (!priceId) {
      setError("現在このプランは準備中です。しばらくお待ちください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planName }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "決済ページへの遷移に失敗しました。");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className={`w-full rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] disabled:opacity-60 ${btnClass}`}
      >
        {loading ? "処理中..." : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
