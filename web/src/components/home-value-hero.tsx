"use client";

import Image from "next/image";
import Link from "next/link";

const FEATURES = [
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    color: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-600 text-white",
    labelColor: "text-orange-800",
    label: "KY用紙（危険予知）",
    desc: "KY（危険予知）活動をデジタル化。シンプルモード・詳細モード対応。リスクをその場で記録できます。",
    href: "/ky",
    btnColor: "bg-orange-600 hover:bg-orange-700 text-white",
    btnLabel: "KY用紙を作成する",
  },
] as const;

const STATS = [
  { value: "200+", label: "事故事例" },
  { value: "100+", label: "法改正データ" },
  { value: "3対応", label: "PC・スマホ・大画面" },
  { value: "AI対応", label: "リスク予測・要約" },
] as const;

export function HomeValueHero() {
  return (
    <div className="space-y-5" aria-label="ホームの価値案内">
      {/* メインキャッチ */}
      <div className="rounded-2xl border border-[#155a38] bg-gradient-to-br from-[#1a7a4c] via-[#166640] to-[#0f4d2e] px-5 py-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-200">
            ANZEN AI — 労働安全コンサルタント監修
          </p>
        </div>
        <h2 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
          現場の安全を、<br className="sm:hidden" />
          AIで変える。
        </h2>
        <p className="mt-2 text-sm leading-6 text-green-100">
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* メインCTA */}
          <Link
            href="/risk-prediction"
            className="rounded-md bg-blue-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-400 transition-colors text-center"
          >
            無料で使ってみる → AIリスク予測
          </Link>
          {/* 入門者向けCTA（新人・初学者向け） */}
          <Link
            href="/e-learning"
            className="rounded-md border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors text-center"
          >
            はじめての方へ → 入門Eラーニング
          </Link>
          {/* サブCTA: ページ内スクロール */}
          <button
            type="button"
            onClick={() => {
              document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors text-center"
          >
            機能一覧を見る ↓
          </button>
        </div>
        </div>
        {/* マスコット */}
        <div className="hidden sm:flex flex-shrink-0 items-end self-end pb-1">
          <Image
            src="/mascot/mascot-chihuahua-4.png"
            alt="ANZEN AI マスコット"
            width={80}
            height={80}
            className="drop-shadow-md"
          />
        </div>
        </div>
      </div>

      {/* 導入効果 */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">導入効果（想定値）</p>
        <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          現場の安全管理を効率化
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { icon: "⏱", metric: "朝礼準備", before: "10分", after: "1分", color: "bg-blue-50 border-blue-200 text-blue-800" },
            { icon: "📋", metric: "法改正の見落とし", before: "見落としリスク", after: "ゼロ", color: "bg-sky-50 border-sky-200 text-sky-800" },
            { icon: "📝", metric: "KY作成時間", before: "従来比", after: "75%削減", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
            { icon: "🔍", metric: "事故事例の検索", before: "数十分", after: "即座に", color: "bg-amber-50 border-amber-200 text-amber-800" },
          ] as const).map((item) => (
            <div key={item.metric} className={`rounded-xl border p-3 ${item.color}`}>
              <p className="text-lg" aria-hidden="true">{item.icon}</p>
              <p className="mt-1 text-[11px] font-semibold leading-4">{item.metric}</p>
              <p className="mt-1.5 text-xs text-slate-500 line-through">{item.before}</p>
              <p className="text-sm font-bold">{item.after}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          ※ 数値は監修者（労働安全コンサルタント）の社内テストおよびβ運用の試算に基づく想定値です。実際の効果は現場・運用により異なります。
        </p>
      </div>

      {/* 主要機能カード */}
      <div id="features-section" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {/* サービス導線（受託業務 / 特別教育 / 月額顧問） */}
      <section
        aria-labelledby="services-section-heading"
        className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          ANZEN AI サービス
        </p>
        <h3 id="services-section-heading" className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          安全 × AI/DX を、現場で形にします。
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          労働安全コンサルタント監修。安全診断・KY システム化・特別教育・月額顧問まで、現場の課題に合わせて選べます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              href: "/services",
              title: "受託業務",
              desc: "安全診断・KY システム・VBA・AI 研修まで対応。¥198,000〜。",
              cta: "受託メニューを見る",
              color: "bg-white border-emerald-200 hover:border-emerald-400",
              accent: "text-emerald-700",
            },
            {
              href: "/education",
              title: "特別教育（21種）",
              desc: "オンデマンド・カスタマイズ・講師派遣。¥50,000〜。",
              cta: "教育メニューを見る",
              color: "bg-white border-amber-200 hover:border-amber-400",
              accent: "text-amber-700",
            },
            {
              href: "/consulting",
              title: "月額顧問",
              desc: "労働安全顧問 / AI・DX 顧問 / セット。¥150,000〜/月。",
              cta: "顧問プランを見る",
              color: "bg-white border-violet-200 hover:border-violet-400",
              accent: "text-violet-700",
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-shadow hover:shadow-md ${card.color}`}
            >
              <div>
                <p className={`text-sm font-bold ${card.accent}`}>{card.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">{card.desc}</p>
              </div>
              <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${card.accent}`}>
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
