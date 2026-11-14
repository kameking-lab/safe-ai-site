"use client";
import Link from "next/link";
import { createContext, useContext } from "react";
import { PRO_MONTHLY_PRICE_YEN, proStartHref } from "@/lib/pro-start";
export const ProPurchasePresentationContext = createContext<{price:string|null; busy?:boolean; message?:string}|undefined>(undefined);

/**
 * 無料枠に当たった所に出す購入の入口。主ボタンは1つだけ。
 * 押すと（未ログインならログインを挟んで）そのまま決済に進む。アプリでは同じリンクを
 * アプリ側が受け取り、App Store の購入シートを開く（/pricing/start は経由しない）。
 */
export function ProUpsellCard({
  message,
  returnTo,
  className = "",
}: {
  message: string;
  returnTo: string;
  className?: string;
}) {
  const native = useContext(ProPurchasePresentationContext);
  return (
    <div
      role="alert"
      data-pro-upsell=""
      className={`rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-slate-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50 ${className}`}
    >
      <p className="font-semibold">{message}</p>
      <p className="mt-1">Pro：法令AIチャット1日50回、アプリの警報10地点と通知。ウェブとアプリで合算します。</p>
      <Link
        href={proStartHref(returnTo)}
        data-pro-start=""
        aria-disabled={native?.busy || undefined}
        className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-bold text-white hover:bg-emerald-700"
      >
        {native ? (native.price ? `月額${native.price}で続ける` : "App Storeの表示価格で続ける") : `月額${PRO_MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円で続ける`}
      </Link>
      {native?.message ? <p role="status" className="mt-1 text-xs">{native.message}</p> : null}
      <p className="mt-1.5 text-[11px] leading-4 text-slate-600 dark:text-emerald-200">
        1か月ごとの自動更新・いつでも解約できます。全体の月間AI原価上限による生成停止があります。
        <Link href="/pricing/terms" className="underline">条件・特商法表示</Link>・
        <Link href="/terms" className="underline">利用規約</Link>・<Link href="/privacy" className="underline">プライバシーポリシー</Link>
      </p>
    </div>
  );
}
