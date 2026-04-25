"use client";

import { useState } from "react";

interface Props {
  planId: string;
  planName: string;
  label: string;
  variant: "amber" | "blue" | "emerald";
}

function priceIdFor(planId: string): string | undefined {
  if (planId === "standard") return process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM;
  if (planId === "pro") return process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
  return undefined;
}

export function PricingCheckout({ planId, planName, label, variant }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnClass =
    variant === "amber"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : variant === "emerald"
        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white";

  async function handleClick() {
    setError(null);
    const priceId = priceIdFor(planId);
    if (!priceId) {
      setError("価格IDが設定されていません。管理者に連絡してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planName }),
      });
      if (res.status === 401) {
        const next = encodeURIComponent("/pricing");
        window.location.href = `/api/auth/signin?callbackUrl=${next}`;
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "決済セッションの作成に失敗しました。");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`block w-full rounded-xl py-2.5 text-center text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${btnClass}`}
      >
        {loading ? "決済画面に移動中..." : label}
      </button>
      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] leading-5 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
