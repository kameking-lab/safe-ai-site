"use client";

import Link from "next/link";

const LINKS = [
  {
    group: "朝礼・現場確認",
    items: [
      { href: "/signage", label: "サイネージ", sub: "常時表示用フルスクリーン", color: "bg-emerald-600 text-white" },
      { href: "/risk", label: "今日の現場リスク", sub: "天気・警報・注意点", color: "bg-slate-100 text-slate-800" },
      { href: "/risk-prediction", label: "AIリスク予測", sub: "作業別・事例検索・PDF出力", color: "bg-blue-600 text-white" },
    ],
  },
  {
    group: "安全管理・記録",
    items: [
      { href: "/ky", label: "KY用紙", sub: "危険予知・作業指示書", color: "bg-slate-100 text-slate-800" },
      { href: "/accidents", label: "事故DB", sub: "事例200件以上を検索", color: "bg-slate-100 text-slate-800" },
      { href: "/laws", label: "法改正", sub: "AI要約・質問チャット", color: "bg-slate-100 text-slate-800" },
    ],
  },
  {
    group: "学習・設定",
    items: [
      { href: "/e-learning", label: "Eラーニング", sub: "問題・テーマ別学習", color: "bg-slate-100 text-slate-800" },
      { href: "/notifications", label: "通知/配信", sub: "メール・プッシュ設定", color: "bg-slate-100 text-slate-800" },
      { href: "/goods", label: "安全グッズ", sub: "推奨装備・用品", color: "bg-amber-500 text-white" },
    ],
  },
] as const;

export function PortalQuickLinks() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold text-slate-900 sm:text-base">クイックアクセス</h2>
      <div className="mt-3 space-y-4">
        {LINKS.map((group) => (
          <div key={group.group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.group}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 ${item.color} group flex flex-col`}
                >
                  <span className="text-xs font-bold leading-tight">{item.label}</span>
                  <span className={`mt-0.5 text-[10px] leading-tight ${item.color.includes("text-white") ? "text-white/70" : "text-slate-500"}`}>
                    {item.sub}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
