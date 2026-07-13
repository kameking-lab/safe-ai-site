"use client";

/**
 * 建設計算ハブの発見層（クライアント）。
 * - registry 由来の計算機を **カテゴリ束**（玉掛け・吊り／足場・防護／土工・支保工／
 *   コンクリート／電気／換算）で表示し、28機規模でも迷子にしない。
 * - **現場語での絞り込み**（「あだ巻き」「朝顔」「側圧」「安全ネット」等）を上部の入力で提供。
 *   マッチは各計算機の keywords（現場語 alias 含む）＋名称＋要約＋束ラベル/別名に対して行う。
 * - 分類は categories.ts の groupCalculatorsByCategory（registry 駆動）に委ねるため、部隊の
 *   新機は宣言なしでも正しい束へ自動で入る。
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Cable,
  Construction,
  Mountain,
  Layers,
  Zap,
  Repeat,
  Droplets,
  Boxes,
  ClipboardCheck,
  Ruler,
  Container,
  HardHat,
  Truck,
  BookOpenCheck,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { CalcCategoryId } from "@/lib/construction-calc/schema";
import {
  CALC_CATEGORIES,
  groupCalculatorsByCategory,
} from "@/lib/construction-calc/categories";

export type CalcHubItem = {
  slug: string;
  shortTitle: string;
  summary: string;
  /** 根拠の先頭ラベル（「（」より前の短縮） */
  basisLabel: string;
  category: CalcCategoryId;
  keywords: string[];
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cable: Cable,
  construction: Construction,
  mountain: Mountain,
  layers: Layers,
  zap: Zap,
  repeat: Repeat,
  calculator: Calculator,
};

const CALC_ICONS: Record<string, LucideIcon> = {
  "sling-wire-load": Cable,
  "scaffold-tankan-check": Construction,
  "excavation-slope": Mountain,
  "soil-volume-conversion": Truck,
  "crane-rated-load": HardHat,
  "formwork-shoring-check": Layers,
  "cable-ampacity": Zap,
  "wind-load-temporary": Construction,
  "earth-pressure-shoring": Mountain,
  "anchor-pullout": Layers,
  "safety-net-check": Construction,
  "scaffold-load-summary": Construction,
  "protective-canopy-check": Construction,
  "suspended-scaffold-check": Construction,
  "ladder-stepladder-check": Construction,
  "work-platform-opening-check": Construction,
  "water-pressure": Droplets,
  "formwork-lateral-pressure": Boxes,
  "shoring-member-check": ClipboardCheck,
  "rebar-mass": Ruler,
  "concrete-volume": Container,
};

function matchesQuery(item: CalcHubItem, q: string): boolean {
  if (!q) return true;
  const haystack = [item.shortTitle, item.summary, ...item.keywords].join(" ").toLowerCase();
  // 空白区切りの各語を AND（横断検索エンジンと同じ規約に寄せる）
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function ConstructionCalcHub({ calcs }: { calcs: CalcHubItem[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CalcCategoryId | "all">("all");

  // 束のチップは「全計算機に実在する束」だけ出す（空の束は出さない）。
  const presentCategories = useMemo(() => {
    const present = new Set(groupCalculatorsByCategory(calcs).map((g) => g.category.id));
    return CALC_CATEGORIES.filter((c) => present.has(c.id));
  }, [calcs]);

  const groups = useMemo(() => {
    const filtered = calcs.filter(
      (c) =>
        matchesQuery(c, query) && (activeCategory === "all" || c.category === activeCategory),
    );
    return groupCalculatorsByCategory(filtered);
  }, [calcs, query, activeCategory]);

  const totalHits = useMemo(() => groups.reduce((n, g) => n + g.calcs.length, 0), [groups]);

  return (
    <section aria-label="計算機を探す" className="mt-6">
      {/* 現場語で絞り込み */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="現場のことばで絞り込む（例: あだ巻き・朝顔・側圧・安全ネット・掘削）"
          aria-label="計算機を現場のことばで絞り込む"
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* 束チップ */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="分野で絞り込む">
        <CategoryChip
          label="すべて"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {presentCategories.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.label}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory((prev) => (prev === c.id ? "all" : c.id))}
          />
        ))}
      </div>

      {totalHits === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
          「{query}」に一致する計算機は見つかりませんでした。上のAI入口に自由記述で相談するか、
          絞り込みを変えてお試しください。
        </p>
      ) : (
        <div className="mt-5 space-y-7">
          {groups.map(({ category, calcs: groupCalcs }) => {
            const CatIcon = CATEGORY_ICONS[category.iconKey] ?? Calculator;
            return (
              <div key={category.id}>
                <div className="mb-2.5 flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{category.label}</h3>
                  <span className="text-xs text-slate-400">{category.description}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupCalcs.map((calc) => {
                    const Icon = CALC_ICONS[calc.slug] ?? CatIcon;
                    return (
                      <Link
                        key={calc.slug}
                        href={`/construction-calc/${calc.slug}`}
                        className="group flex min-h-[44px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                            <Icon className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                          </div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {calc.shortTitle}
                          </h4>
                        </div>
                        <p className="mt-2 flex-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                          {calc.summary}
                        </p>
                        <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          根拠: {calc.basisLabel}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 group-hover:underline dark:text-amber-400">
                          計算する
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-amber-500 bg-amber-500 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
