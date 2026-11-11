"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const MESSAGES: Record<string, string> = {
  PRO_SALES_PAUSED: "今月のPro新規受付は終了しました。来月1日に再開します。",
  ALREADY_SUBSCRIBED: "すでに Pro です。追加の購入は不要です。",
  PURCHASE_PENDING: "別の購入手続き（App Store など）が進行中です。完了を待つか、アプリの「購入を復元」をお試しください。",
  PURCHASE_REVIEW_REQUIRED: "前回の購入手続きの確認が必要です。お問い合わせください。",
  ENTITLEMENT_SYNC_PENDING: "会員の権利を確認できませんでした。二重請求を避けるため、時間をおいてもう一度お試しください。",
};

function errorText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const code = (value as { code?: unknown }).code;
    if (typeof code === "string") return MESSAGES[code] ?? `決済画面を開けませんでした（${code}）。`;
  }
  return "決済画面を開けませんでした。";
}

/** 決済画面へ即移動する。ボタンを押したことが同意で、ここで確認は挟まない。 */
export function AutoCheckout({ returnTo }: { returnTo: string | null }) {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        // 期限切れの決済セッションは1回だけ作り直す。
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: "pro", returnTo }),
          });
          if (response.status === 401) {
            const self = returnTo ? `/pricing/start?returnTo=${encodeURIComponent(returnTo)}` : "/pricing/start";
            location.replace(`/auth/signin?callbackUrl=${encodeURIComponent(self)}`);
            return;
          }
          const body = (await response.json().catch(() => ({}))) as { url?: unknown; state?: unknown; error?: unknown };
          if (typeof body.url === "string" && body.url.startsWith("https://checkout.stripe.com/")) {
            location.replace(body.url);
            return;
          }
          if (body.state === "completed") {
            location.replace(returnTo ?? "/account");
            return;
          }
          if (body.state === "expired") continue;
          throw new Error(errorText(body.error));
        }
        throw new Error("決済画面を開けませんでした。もう一度お試しください。");
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "決済画面を開けませんでした。");
      }
    })();
  }, [returnTo]);
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center" aria-live="polite">
      {error ? (
        <>
          <p role="alert" className="font-semibold text-slate-900">{error}</p>
          <Link href={returnTo ?? "/pricing"} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 font-semibold">
            戻る
          </Link>
        </>
      ) : (
        <p role="status" className="text-slate-700">決済画面へ移動しています…</p>
      )}
    </div>
  );
}
