"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Filter } from "lucide-react";

export type SubsidyScale = "small" | "mid" | "medium-large" | "any";
export type SubsidyIndustry =
  | "construction"
  | "manufacturing"
  | "healthcare"
  | "transport"
  | "forestry"
  | "food"
  | "retail"
  | "cleaning"
  | "electrical"
  | "chemical"
  | "any";

export type SubsidyRegionScope = "nationwide" | "tokyo-kanto" | "kansai" | "hokkaido-tohoku" | "kyushu-okinawa" | "other";

export type Subsidy = {
  id: string;
  name: string;
  target: string;
  amount: string;
  purpose: string[];
  operator: string;
  url: string;
  note?: string;
  /** 事業規模タグ（「any」は全規模対象） */
  scale_tags: SubsidyScale[];
  /** 対象業種タグ（「any」は全業種対象） */
  industry_tags: SubsidyIndustry[];
  /** 申請可能な地域スコープ */
  region_tags: SubsidyRegionScope[];
};

const SCALE_OPTIONS: { key: Exclude<SubsidyScale, "any">; label: string }[] = [
  { key: "small", label: "小規模事業者（20名以下）" },
  { key: "mid", label: "中小企業（21〜300名）" },
  { key: "medium-large", label: "中堅（301名〜）" },
];

const INDUSTRY_OPTIONS: { key: Exclude<SubsidyIndustry, "any">; label: string }[] = [
  { key: "construction", label: "建設" },
  { key: "manufacturing", label: "製造" },
  { key: "healthcare", label: "医療福祉" },
  { key: "transport", label: "運輸" },
  { key: "forestry", label: "林業" },
  { key: "food", label: "食品" },
  { key: "retail", label: "小売" },
  { key: "cleaning", label: "清掃" },
  { key: "electrical", label: "電気" },
  { key: "chemical", label: "化学" },
];

const REGION_OPTIONS: { key: Exclude<SubsidyRegionScope, "nationwide">; label: string }[] = [
  { key: "tokyo-kanto", label: "東京・関東" },
  { key: "kansai", label: "関西" },
  { key: "hokkaido-tohoku", label: "北海道・東北" },
  { key: "kyushu-okinawa", label: "九州・沖縄" },
  { key: "other", label: "その他地域" },
];

function matchScale(subsidy: Subsidy, scale: SubsidyScale | null): boolean {
  if (!scale) return true;
  return subsidy.scale_tags.includes("any") || subsidy.scale_tags.includes(scale);
}

function matchIndustry(subsidy: Subsidy, industry: SubsidyIndustry | null): boolean {
  if (!industry) return true;
  return subsidy.industry_tags.includes("any") || subsidy.industry_tags.includes(industry);
}

function matchRegion(subsidy: Subsidy, region: SubsidyRegionScope | null): boolean {
  if (!region) return true;
  return subsidy.region_tags.includes("nationwide") || subsidy.region_tags.includes(region);
}

function scoreFor(subsidy: Subsidy, scale: SubsidyScale | null, industry: SubsidyIndustry | null, region: SubsidyRegionScope | null): number {
  let score = 0;
  if (scale && subsidy.scale_tags.includes(scale)) score += 2;
  if (scale && subsidy.scale_tags.includes("any")) score += 1;
  if (industry && subsidy.industry_tags.includes(industry)) score += 2;
  if (industry && subsidy.industry_tags.includes("any")) score += 1;
  if (region && subsidy.region_tags.includes(region)) score += 2;
  if (region && subsidy.region_tags.includes("nationwide")) score += 1;
  return score;
}

export function SubsidiesRecommender({ subsidies }: { subsidies: Subsidy[] }) {
  const [scale, setScale] = useState<SubsidyScale | null>(null);
  const [industry, setIndustry] = useState<SubsidyIndustry | null>(null);
  const [region, setRegion] = useState<SubsidyRegionScope | null>(null);

  const filtered = useMemo(() => {
    const matches = subsidies.filter(
      (s) => matchScale(s, scale) && matchIndustry(s, industry) && matchRegion(s, region),
    );
    if (!scale && !industry && !region) return matches;
    return [...matches].sort(
      (a, b) => scoreFor(b, scale, industry, region) - scoreFor(a, scale, industry, region),
    );
  }, [subsidies, scale, industry, region]);

  const hasFilter = scale !== null || industry !== null || region !== null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          主な助成金・補助金
          {hasFilter && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              {filtered.length}件ヒット
            </span>
          )}
        </h2>
        {hasFilter && (
          <button
            type="button"
            onClick={() => { setScale(null); setIndustry(null); setRegion(null); }}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            フィルタをリセット
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        最終更新：2026年4月。制度改正が頻繁な領域のため、申請前に各公式ページで最新条件を確認してください。
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="h-4 w-4" aria-hidden="true" />
          条件を絞って推薦する（事業規模 × 業種 × 地域）
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold text-slate-600">事業規模</p>
            <div className="flex flex-wrap gap-1.5">
              {SCALE_OPTIONS.map((opt) => {
                const selected = scale === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScale(selected ? null : opt.key)}
                    className={`min-h-[40px] rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selected ? "bg-emerald-600 text-white shadow" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-emerald-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold text-slate-600">業種</p>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_OPTIONS.map((opt) => {
                const selected = industry === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIndustry(selected ? null : opt.key)}
                    className={`min-h-[40px] rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selected ? "bg-sky-600 text-white shadow" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-sky-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold text-slate-600">地域</p>
            <div className="flex flex-wrap gap-1.5">
              {REGION_OPTIONS.map((opt) => {
                const selected = region === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRegion(selected ? null : opt.key)}
                    className={`min-h-[40px] rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selected ? "bg-amber-600 text-white shadow" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-amber-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            条件に一致する助成金がありません。フィルタを1つ外してみてください。
          </p>
        ) : (
          filtered.map((s) => {
            const score = hasFilter ? scoreFor(s, scale, industry, region) : 0;
            const isTop = hasFilter && score >= 4;
            return (
              <article
                key={s.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  isTop ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                    {isTop && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        おすすめ
                      </span>
                    )}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    公式ページ <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
                <dl className="mt-3 space-y-1.5 text-xs text-slate-700 sm:text-sm">
                  <div className="grid grid-cols-[70px_1fr] gap-2 sm:grid-cols-[100px_1fr]">
                    <dt className="font-semibold text-slate-500">対象</dt>
                    <dd>{s.target}</dd>
                  </div>
                  <div className="grid grid-cols-[70px_1fr] gap-2 sm:grid-cols-[100px_1fr]">
                    <dt className="font-semibold text-slate-500">金額</dt>
                    <dd>{s.amount}</dd>
                  </div>
                  <div className="grid grid-cols-[70px_1fr] gap-2 sm:grid-cols-[100px_1fr]">
                    <dt className="font-semibold text-slate-500">所管</dt>
                    <dd>{s.operator}</dd>
                  </div>
                </dl>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">主な使い道</p>
                  <ul className="mt-1.5 space-y-1 text-xs leading-5 text-slate-700">
                    {s.purpose.map((p) => (
                      <li key={p} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {hasFilter && isTop && (
                  <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-900">
                    このフィルタ条件で事業規模・業種・地域の3項目とも一致している制度です。
                  </p>
                )}
                {s.note && (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">※ {s.note}</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
