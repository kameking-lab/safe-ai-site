"use client";

import Link from "next/link";

export function PortalQuickLinks() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">安全AIポータル</h2>
      <p className="mt-1 text-xs text-slate-600">現場でよく使う入口をまとめています。朝礼・常時表示・個人確認に使えます。</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link
          className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white"
          href="/signage"
        >
          サイネージ
        </Link>
        <Link className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800" href="/risk">
          今日の現場リスク
        </Link>
        <Link className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800" href="/risk">
          警報注意報
        </Link>
        <Link className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800" href="/accidents">
          事故DB
        </Link>
        <Link className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800" href="/laws">
          法改正
        </Link>
        <Link className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800" href="/ky">
          KY用紙
        </Link>
        <Link className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800" href="/e-learning">
          Eラーニング
        </Link>
        <Link
          className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800"
          href="/notifications"
        >
          通知/配信
        </Link>
        <Link className="rounded-lg bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-white" href="/goods">
          安全グッズ
        </Link>
      </div>
    </section>
  );
}
