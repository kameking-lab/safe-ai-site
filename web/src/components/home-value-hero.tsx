"use client";

import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M12 2C7.03 2 3 6.03 3 11v2h18v-2c0-4.97-4.03-9-9-9z" />
        <path d="M2 13h20" />
        <path d="M3 15a9 9 0 0 0 18 0" />
      </svg>
    ),
    color: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-600 text-white",
    labelColor: "text-emerald-800",
    label: "朝礼・現場リスク",
    desc: "今日の天気・警報から現場向け注意事項を自動生成。朝礼ネタがすぐ揃う。",
    href: "/risk",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    btnLabel: "今日のリスクを確認",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
    color: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-600 text-white",
    labelColor: "text-blue-800",
    label: "AIリスク予測",
    desc: "作業種別・環境条件から潜在リスクをAIが予測。事故事例との照合で根拠も確認できる。",
    href: "/risk-prediction",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white",
    btnLabel: "AIリスク予測を使う",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    color: "bg-sky-50 border-sky-200",
    iconBg: "bg-sky-600 text-white",
    labelColor: "text-sky-800",
    label: "法改正チェック",
    desc: "労安法・化学物質管理など100件以上の改正を一覧。AI要約・質問で即理解。",
    href: "/laws",
    btnColor: "bg-sky-600 hover:bg-sky-700 text-white",
    btnLabel: "法改正を見る",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    color: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-600 text-white",
    labelColor: "text-orange-800",
    label: "事故DB・KY用紙",
    desc: "事故事例200件以上を業種・種別で検索。KY用紙の作成・Eラーニングもワンストップで。",
    href: "/accidents",
    btnColor: "bg-orange-600 hover:bg-orange-700 text-white",
    btnLabel: "事故DBを見る",
  },
] as const;

const STATS = [
  { value: "200+", label: "事故事例" },
  { value: "100+", label: "法改正データ" },
  { value: "3画面", label: "PC/スマホ/サイネージ" },
  { value: "AI対応", label: "リスク予測・要約" },
] as const;

export function HomeValueHero() {
  return (
    <div className="space-y-5" aria-label="ホームの価値案内">
      {/* メインキャッチ */}
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-5 py-6 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
            労働安全コンサルタント監修
          </p>
        </div>
        <h2 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
          現場の安全判断を、<br className="sm:hidden" />
          今すぐ・ここで完結。
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          建設・製造・林業の現場責任者・安全担当向け。
          朝礼用リスク確認・法改正・KY用紙・事故DB・Eラーニングを一つのポータルに集約。
          スマホでも大画面サイネージでも使えます。
        </p>

        {/* 統計バッジ */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2 text-center">
              <p className="text-base font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-300">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/signage"
            className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400 transition-colors"
          >
            サイネージ表示
          </Link>
          <Link
            href="/risk-prediction"
            className="rounded-md bg-blue-500 px-4 py-2 text-xs font-bold text-white hover:bg-blue-400 transition-colors"
          >
            AIリスク予測
          </Link>
          <Link
            href="/risk"
            className="rounded-md border border-slate-500 bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600 transition-colors"
          >
            今日の現場リスク
          </Link>
        </div>
      </div>

      {/* 4大機能カード */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className={`flex flex-col justify-between rounded-xl border p-4 ${f.color} transition-shadow hover:shadow-md`}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${f.iconBg} shadow-sm`}>
                  {f.icon}
                </span>
                <span className={`text-sm font-bold ${f.labelColor}`}>{f.label}</span>
              </div>
              <p className="mt-2.5 text-xs leading-5 text-slate-700">{f.desc}</p>
            </div>
            <Link
              href={f.href}
              className={`mt-3 inline-block rounded-md px-3 py-2 text-center text-xs font-semibold transition-colors ${f.btnColor}`}
            >
              {f.btnLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
