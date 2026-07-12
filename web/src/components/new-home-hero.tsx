"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageSquare, ClipboardList, BarChart3, CalendarCheck, Search } from "lucide-react";
import { SITE_STATS, SITE_STATS_META, type SiteStatKey } from "@/data/site-stats";
import { useLanguage } from "@/contexts/language-context";

type StatItem = {
  key: SiteStatKey;
  value: string;
  labelJa: string;
  labelEn: string;
  hintJa: string;
  hintEn: string;
};

const STATS: StatItem[] = [
  {
    key: "mhlwNoticeCount",
    value: SITE_STATS.mhlwNoticeCount,
    labelJa: "厚労省 通達・告示",
    labelEn: "MHLW Directives & Notices",
    hintJa: "拘束力レベル付き",
    hintEn: "With legal weight labels",
  },
  {
    key: "accidents10yCount",
    value: SITE_STATS.accidents10yCount,
    labelJa: "事故事例（10年統合）",
    labelEn: "Accident Cases (10-year combined)",
    hintJa: "業種・原因別検索",
    hintEn: "Filter by industry / cause",
  },
  {
    key: "equipmentItemCount",
    value: SITE_STATS.equipmentItemCount,
    labelJa: "保護具DB点数",
    labelEn: "PPE Database Items",
    hintJa: "JIS規格・国家検定品",
    hintEn: "JIS standard / type-approved",
  },
];

/** 新トップページヒーロー: 「現場の安全を、AIで変える。」 */
export function NewHomeHero() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950"
    >
      {/* 背景イラスト（夜明けの現場・生成画・20.9KB）: sm以上のみ＝モバイルLCP不可侵。
          文字コントラストAAは白/濃紺オーバーレイで担保する */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden="true">
        <Image
          src="/mascot/hero-bg-dawn.webp"
          alt=""
          fill
          sizes="100vw"
          loading="lazy"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/65 to-white/85 dark:from-slate-950/85 dark:via-slate-950/75 dark:to-slate-950/90" />
      </div>
      {/* マスコット（指差呼称）: PC装飾。絶対配置＋明示寸法でCLS 0 */}
      <div
        className="pointer-events-none absolute bottom-2 right-6 hidden xl:block"
        aria-hidden="true"
      >
        <Image
          src="/mascot/mascot-pointing.webp"
          alt=""
          width={155}
          height={150}
          loading="lazy"
          style={{ width: 155, height: 150, objectFit: "contain" }}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:py-16">
        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
            {isEn ? "Anzen AI Portal (Japan OSH research)" : "安全AIポータル"}
          </p>
          <h1
            id="home-hero-title"
            className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl"
          >
            {isEn ? "Transform workplace safety with AI." : "労働安全衛生のAI・DX活用ポータル"}
          </h1>
          {!isEn && (
            <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-600 dark:text-slate-400 sm:text-xl lg:text-2xl">
              現場の安全を、AIで変える。
            </h2>
          )}
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            {isEn
              ? "A research project on AI and DX for occupational safety and health. One-stop support for field operations in construction, manufacturing, transportation, healthcare, and forestry."
              : "労働安全衛生のAI・DX活用研究プロジェクト。建設・製造・運輸・医療福祉・林業の現場運用をワンストップで支援します。"}
          </p>

          {/* メイン3機能 CTA: chatbot / accidents-reports / strategy/plan-generator */}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link
              href="/chatbot"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-600 hover:to-emerald-800 hover:shadow-lg hover:shadow-emerald-600/30 active:translate-y-px"
            >
              <MessageSquare className="h-4 w-4" />
              {isEn ? "Ask the OSH-Law AI" : "労働安全衛生法をAIに質問"}
            </Link>
            <Link
              href="/accidents-reports"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-600 hover:to-emerald-800 hover:shadow-lg hover:shadow-emerald-600/30 active:translate-y-px"
            >
              <BarChart3 className="h-4 w-4" />
              {isEn ? "Industry accident reports" : "業種別 事故分析レポート"}
            </Link>
            <Link
              href="/strategy/plan-generator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-600 hover:to-emerald-800 hover:shadow-lg hover:shadow-emerald-600/30 active:translate-y-px"
            >
              <CalendarCheck className="h-4 w-4" />
              {isEn ? "Annual OSH plan generator" : "年次安全衛生計画を作成"}
            </Link>
          </div>

          {/* KY/検索 ショートカット: モバイルボトムナビから外れた2機能を最上部で2タップ以内に確保 */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/ky"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {isEn ? "Build a KY in 3 min" : "KYを3分で作る"}
            </Link>
            <Link
              href="/law-search"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <Search className="h-3.5 w-3.5" />
              {isEn ? "Search law / articles" : "法令・条文を検索"}
            </Link>
          </div>
        </div>

        {/* 統計バー: 375px (grid-cols-2) では3枚目が2列分にまたがる 2+1 レイアウト */}
        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {STATS.map((s, idx) => {
            const meta = SITE_STATS_META[s.key];
            const isThird = idx === 2;
            return (
              <li
                key={s.key}
                className={`flex min-h-[96px] flex-col rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:min-h-[108px] sm:px-4 sm:py-4 ${
                  isThird ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl lg:text-3xl">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 sm:text-xs">
                  {isEn ? s.labelEn : s.labelJa}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEn ? s.hintEn : s.hintJa}
                </p>
                {meta?.sourceUrl ? (
                  <a
                    href={meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-[11px] leading-4 text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
                  >
                    {isEn ? `Source · ${meta.asOf}` : `出典・${meta.asOf}`}
                  </a>
                ) : (
                  <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-400" title={meta?.source ?? ""}>
                    {isEn ? `Source: ${meta?.source ?? ""}` : `出典: ${meta?.source ?? ""}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
