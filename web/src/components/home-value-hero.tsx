"use client";

import Image from "next/image";
import Link from "next/link";

const STATS = [
  { value: "504,415", label: "厚労省 事故DB収録件数", hint: "全件検索対応" },
  { value: "1,389", label: "死亡労災（R5・建設業）", hint: "厚労省統計" },
  { value: "1,127", label: "法改正データ", hint: "10年分を横断" },
  { value: "21", label: "特別教育 対応種別", hint: "過去問クイズ付" },
] as const;

const TARGET_PROFILES = [
  {
    title: "現場の安全担当者",
    desc: "朝礼のKY・法改正チェック・事故事例検索を、スマホ一台で済ませたい方。",
  },
  {
    title: "中小企業の経営者",
    desc: "安全管理の属人化・Excel地獄・紙のKY用紙から脱出したい方。",
  },
  {
    title: "安全衛生責任者",
    desc: "特別教育・化学物質RA・安衛法対応を体系化し、労基署対応を楽にしたい方。",
  },
  {
    title: "DX推進担当",
    desc: "AI・Claude Codeを安全分野に組み込み、業務を数倍速にしたい方。",
  },
] as const;

const CAPABILITIES = [
  {
    emoji: "🛡",
    label: "AIリスク予測",
    desc: "作業種別×環境条件で潜在リスクをAI予測。事故事例根拠付き。",
    href: "/risk-prediction",
  },
  {
    emoji: "📋",
    label: "法改正チェック",
    desc: "労安法・化学物質管理の改正100件以上。AI要約・質問で即理解。",
    href: "/laws",
  },
  {
    emoji: "📝",
    label: "KY用紙（危険予知）",
    desc: "紙を廃止。シンプル／詳細モード、音声入力、PDF出力対応。",
    href: "/ky",
  },
  {
    emoji: "🗂",
    label: "事故データベース",
    desc: "厚労省50万件を横断検索。業種・原因別に傾向を把握。",
    href: "/accidents",
  },
  {
    emoji: "🎓",
    label: "Eラーニング・過去問",
    desc: "特別教育21種の過去問クイズ。動画教材・修了証発行に対応。",
    href: "/e-learning",
  },
  {
    emoji: "💬",
    label: "安衛法チャットボット",
    desc: "「これって違反？」の疑問を即解決。条文根拠を示して回答。",
    href: "/chatbot",
  },
] as const;

const STRENGTH_ITEMS = [
  {
    title: "労働安全コンサルタント（登録番号260022）が直接担当",
    desc: "大手ゼネコンで大型土木インフラの施工管理経験。机上論ではなく、現場で回る仕組みを設計。",
  },
  {
    title: "Claude Code による 2〜5倍の開発速度",
    desc: "本サイト自体が Claude Code 製。短納期・低コストで業務ツール・教材・システムを構築。",
  },
  {
    title: "「安全 × AI/DX」の掛け算は稀少",
    desc: "コンサル × 実装力を1人で両立。要件定義から開発・運用までワンストップで受託。",
  },
];

export function HomeValueHero() {
  return (
    <div className="space-y-6" aria-label="ホームの価値案内">
      {/* メインヒーロー */}
      <div className="rounded-2xl border border-[#155a38] bg-gradient-to-br from-[#1a7a4c] via-[#166640] to-[#0f4d2e] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-200">
                ANZEN AI — 労働安全コンサルタント（登録番号260022）監修
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
              現場の安全を、<br className="sm:hidden" />
              AIで変える。
            </h2>
            <p className="mt-3 text-sm leading-6 text-green-100 sm:text-base">
              建設・製造・介護・林業・運輸の現場向け。
              朝礼KY・法改正・事故DB・Eラーニングを1つのポータルに集約。
              <strong className="text-white">業務の自動化や教育制作の受託</strong>もワンストップで対応します。
            </p>

            {/* 統計バッジ */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-green-100">{s.label}</p>
                  <p className="text-[9px] text-green-200/80">{s.hint}</p>
                </div>
              ))}
            </div>

            {/* 3つのメインCTA */}
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Link
                href="/risk-prediction"
                className="rounded-lg bg-white px-5 py-3 text-center text-sm font-bold text-[#1a7a4c] hover:bg-emerald-50 transition-colors shadow"
              >
                無料で使ってみる →
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border-2 border-white/60 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/20 transition-colors"
              >
                受託業務のご相談 →
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg bg-amber-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-amber-400 transition-colors shadow"
              >
                料金プランを見る →
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-green-100">
              ※ 無料プランはクレカ登録不要。24時間以内にお問い合わせへ返信します（土日祝除く）。
            </p>
          </div>
          {/* マスコット */}
          <div className="hidden sm:flex flex-shrink-0 items-end self-end pb-1">
            <Image
              src="/mascot/mascot-chihuahua-4.png"
              alt="ANZEN AI マスコット"
              width={88}
              height={88}
              className="drop-shadow-md"
            />
          </div>
        </div>
      </div>

      {/* 「こんな方に」セクション */}
      <section
        aria-labelledby="targets-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
          こんな方に
        </p>
        <h3 id="targets-heading" className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          1人でも、1社でも、成果が出るまで伴走します。
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TARGET_PROFILES.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
            >
              <p className="text-sm font-bold text-emerald-800">✓ {p.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-700">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 「できること」セクション */}
      <section
        id="features-section"
        aria-labelledby="capabilities-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600">
          できること
        </p>
        <h3 id="capabilities-heading" className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          現場で使える6つの機能を、無料ですぐ試せます。
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-400 hover:shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">
                  {c.emoji}
                </span>
                <span className="text-sm font-bold text-slate-900">{c.label}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{c.desc}</p>
              <span className="mt-3 text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                使ってみる →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Claude Code × 安全 の強み */}
      <section
        aria-labelledby="strength-heading"
        className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
          Claude Code × 安全 の強み
        </p>
        <h3 id="strength-heading" className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          「現場を知る人間」が「最新AIで実装する」からこそ、速くて正しい。
        </h3>
        <div className="mt-4 space-y-3">
          {STRENGTH_ITEMS.map((s, i) => (
            <div
              key={s.title}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* サービス導線 */}
      <section
        aria-labelledby="services-section-heading"
        className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
          ANZEN AI サービス
        </p>
        <h3 id="services-section-heading" className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          用途に合わせて、無料から受託まで選べます。
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              href: "/pricing",
              title: "月額プラン（¥0〜）",
              desc: "フリー／スタンダード¥980／プロ¥2,980。いつでもキャンセル可。",
              cta: "プランを見る",
              color: "bg-white border-emerald-200 hover:border-emerald-400",
              accent: "text-emerald-700",
            },
            {
              href: "/services",
              title: "受託業務（¥150k〜）",
              desc: "KY・安全管理・教育・法改正通知・Claude Code 開発まで。",
              cta: "受託メニューを見る",
              color: "bg-white border-amber-200 hover:border-amber-400",
              accent: "text-amber-700",
            },
            {
              href: "/contact",
              title: "無料相談30分",
              desc: "課題整理から最適プラン提案まで。強引な営業は一切なし。",
              cta: "相談を申し込む",
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
