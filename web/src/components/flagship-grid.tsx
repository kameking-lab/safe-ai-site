"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FLAGSHIP_FEATURES } from "@/config/flagship-nav";
import { useLanguage } from "@/contexts/language-context";

// P1-L: 「開く →」「配下機能 N件」の抽象ラベルを具体動詞へ。
// 機能ごとに「何ができるか」が一瞬で分かる動詞ラベルを定義する。
const FEATURE_CTA_JA: Record<string, string> = {
  "safety-diary": "日誌を記録する",
  ky: "KY用紙を作る",
  "chemical-ra": "化学物質RAを開始",
  signage: "サイネージを開く",
  laws: "法改正を確認",
  chatbot: "AIに質問する",
  accidents: "事故事例を検索",
  "education-certification": "必要資格を判定",
  industries: "業種から探す",
  "work-environment": "管理区分を判定",
};

const FEATURE_CTA_EN: Record<string, string> = {
  "safety-diary": "Log diary",
  ky: "Create KY sheet",
  "chemical-ra": "Start RA",
  signage: "Open signage",
  laws: "View updates",
  chatbot: "Ask the AI",
  accidents: "Search incidents",
  "education-certification": "Find required licenses",
  industries: "Browse by sector",
  "work-environment": "Classify environment",
};

const EN_FEATURE_COPY: Record<string, { title: string; description: string }> = {
  "safety-diary": {
    title: "Safety & Health Diary",
    description:
      "Log morning briefings, tasks, KY results, and near-misses in 3–5 min. Monthly summaries surface trends visually.",
  },
  ky: {
    title: "KY Quick Builder",
    description:
      "Industry presets and voice input. Build a hazard-prediction sheet in 3 minutes and push it to signage or diary.",
  },
  "chemical-ra": {
    title: "Chemical Risk Assessment",
    description:
      "CREATE-SIMPLE compliant lite RA. Linked to chemical DB and SDS — covers general industrial chemicals to organic solvents.",
  },
  signage: {
    title: "Workplace Signage",
    description:
      "Office monitor / on-site display. Auto-refresh every 30 min with drawings, weather warnings, law updates, and news.",
  },
  laws: {
    title: "Law Amendments & Notices",
    description:
      "Chronological view of MHLW, MLIT, METI amendments. Enforcement-date countdown included.",
  },
  chatbot: {
    title: "OSH-Law AI Chat",
    description:
      "Chatbot specialized in the Occupational Safety & Health Act, related ordinances, and notices. Answers cite article numbers and sources.",
  },
  accidents: {
    title: "Major Accidents & Rosai News",
    description:
      "MHLW, prefecture, and press reports of severe/fatal incidents — filter by industry or work type.",
  },
  "education-certification": {
    title: "Special Education & Skill Training DB",
    description:
      "Full catalog of ~60 special-education courses (OSH Rule Art. 36) and ~40 skill-training courses. Instantly identifies required qualifications by industry and task, with cited articles.",
  },
  industries: {
    title: "Industry Portals (10 sectors)",
    description:
      "Construction, manufacturing, transport, healthcare, service, retail, food, wholesale, warehouse, and office — accident reports, KY, notices, chemicals, special education, and annual plans cross-linked per sector.",
  },
  "work-environment": {
    title: "Work Environment Measurement",
    description:
      "Auto-classifies the 10 measurement targets under OSH Order Art. 21. Computes Management Class 1–3 from A/B measurements and recommends class-specific improvements (Work Environment Measurement Act compliant).",
  },
};

/** トップページの主要機能カードグリッド */
export function FlagshipGrid() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <section aria-labelledby="flagship-grid-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-700">FEATURES</p>
            <h2 id="flagship-grid-title" className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {isEn ? "Flagship features" : "主要機能"}
            </h2>
            <p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">
              {isEn
                ? "Safety diary, KY, chemical RA, signage, law updates, AI chat, and accident news — one-stop support for field operations."
                : "安全衛生日誌・KY・化学物質RA・サイネージ・法改正・AIチャット・事故ニュースで、現場運用をワンストップで支援。"}
            </p>
          </div>
          <Link
            href="/features"
            className="hidden shrink-0 text-xs font-semibold text-emerald-700 hover:underline sm:block"
          >
            {isEn ? "All features →" : "機能一覧（全機能）→"}
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FLAGSHIP_FEATURES.map((f) => {
            const en = EN_FEATURE_COPY[f.id];
            const title = isEn && en ? en.title : f.cardTitle;
            const description = isEn && en ? en.description : f.cardDescription;
            return (
              <li key={f.id}>
                <Link
                  href={f.href}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {f.icon}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 sm:text-base">
                      {title}
                    </h3>
                  </div>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {description}
                  </p>
                  {/* P1-L: 抽象的な「開く →」「配下機能 N件」を具体動詞へ。
                      機能ごとに動詞ラベルを定義（FEATURE_CTA_*）。 */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {isEn
                        ? `+${f.subItems.length} related`
                        : `関連機能 ${f.subItems.length} つ`}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 group-hover:gap-1.5">
                      {isEn ? FEATURE_CTA_EN[f.id] ?? "Open" : FEATURE_CTA_JA[f.id] ?? "開く"}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
