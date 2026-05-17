"use client";

import Link from "next/link";
import { MessageSquare, ClipboardList } from "lucide-react";
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:py-16">
        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
            {isEn ? "ANZEN AI Portal" : "安全AIポータル"}
          </p>
          <h1
            id="home-hero-title"
            className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl"
          >
            {isEn ? "Transform workplace safety with AI." : "現場の安全を、AIで変える。"}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            {isEn
              ? "A research project on AI and DX for occupational safety and health. One-stop support for field operations in construction, manufacturing, transportation, healthcare, and forestry."
              : "労働安全衛生のAI・DX活用研究プロジェクト。建設・製造・運輸・医療福祉・林業の現場運用をワンストップで支援します。"}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              href="/chatbot"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 sm:text-base"
            >
              <MessageSquare className="h-4 w-4" />
              {isEn ? "Ask the OSH-Law AI" : "安衛法AIに質問する"}
            </Link>
            <Link
              href="/ky"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800 sm:text-base"
            >
              <ClipboardList className="h-4 w-4" />
              {isEn ? "Build a KY in 3 min" : "KYを3分で作る"}
            </Link>
          </div>
        </div>

        {/* 統計バー */}
        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-3 sm:gap-4">
          {STATS.map((s) => {
            const meta = SITE_STATS_META[s.key];
            return (
              <li
                key={s.key}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-4 sm:py-4"
              >
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl lg:text-3xl">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 sm:text-xs">
                  {isEn ? s.labelEn : s.labelJa}
                </p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 sm:text-[10px]">
                  {isEn ? s.hintEn : s.hintJa}
                </p>
                {meta?.sourceUrl ? (
                  <a
                    href={meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-[9px] leading-4 text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
                  >
                    {isEn ? `Source · ${meta.asOf}` : `出典・${meta.asOf}`}
                  </a>
                ) : (
                  <p className="mt-1 text-[9px] leading-4 text-slate-400">
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
