"use client";

import Link from "next/link";

const FEATURES = [
  {
    icon: "⛈",
    color: "bg-emerald-50 border-emerald-200",
    labelColor: "text-emerald-800",
    label: "朝礼・現場リスク",
    desc: "今日の天気・警報から現場向け注意事項を自動生成。朝礼ネタがすぐ揃う",
    href: "/risk",
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
    btnLabel: "今日のリスクを確認",
  },
  {
    icon: "⚖",
    color: "bg-sky-50 border-sky-200",
    labelColor: "text-sky-800",
    label: "法改正チェック",
    desc: "労安法・化学物質管理など100件以上の改正を一覧。AI要約・質問で即理解",
    href: "/laws",
    btnColor: "bg-sky-600 hover:bg-sky-700",
    btnLabel: "法改正を見る",
  },
  {
    icon: "📋",
    color: "bg-orange-50 border-orange-200",
    labelColor: "text-orange-800",
    label: "KY・事故DB・Eラーニング",
    desc: "KY用紙の作成・事故事例200件以上の検索・Eラーニングをワンストップで",
    href: "/ky",
    btnColor: "bg-orange-600 hover:bg-orange-700",
    btnLabel: "KY用紙を作成",
  },
] as const;

export function HomeValueHero() {
  return (
    <div className="space-y-4" aria-label="ホームの価値案内">
      {/* メインキャッチ */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-700 px-5 py-5 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
          労働安全コンサルタント監修
        </p>
        <h2 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">
          現場の安全判断を、<br className="sm:hidden" />
          今すぐ・ここで完結。
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          建設・製造・林業の現場責任者・安全担当向け。
          朝礼用リスク確認・法改正・KY用紙・事故DB・Eラーニングを一つのポータルに集約。
          スマホでも大画面サイネージでも使えます。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/signage"
            className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400"
          >
            サイネージ表示
          </Link>
          <Link
            href="/risk"
            className="rounded-md border border-slate-500 bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600"
          >
            今日の現場リスク
          </Link>
        </div>
      </div>

      {/* 3大機能カード */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className={`flex flex-col justify-between rounded-xl border p-4 ${f.color}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{f.icon}</span>
                <span className={`text-xs font-bold ${f.labelColor}`}>{f.label}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-700">{f.desc}</p>
            </div>
            <Link
              href={f.href}
              className={`mt-3 inline-block rounded-md px-3 py-2 text-center text-xs font-semibold text-white ${f.btnColor}`}
            >
              {f.btnLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
