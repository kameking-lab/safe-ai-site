"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type NewsHubItem,
  type NewsHubCategory,
  NEWS_HUB_CATEGORY_LABEL,
  isNewSince,
  filterNewsHubItems,
} from "@/lib/news-hub-types";
import { type IndustryTag, ALL_INDUSTRY_TAGS } from "@/lib/types/domain";

const LAST_VISIT_KEY = "anzen_whatsnew_last_visit_v1";

const CATEGORY_STYLE: Record<NewsHubCategory, string> = {
  "law-revision": "bg-indigo-100 text-indigo-800",
  accident: "bg-rose-100 text-rose-800",
  notice: "bg-sky-100 text-sky-800",
  media: "bg-slate-100 text-slate-700",
  "serious-case": "bg-orange-100 text-orange-800",
};

const FILTERS: { value: NewsHubCategory | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "law-revision", label: "法改正" },
  { value: "accident", label: "事故速報" },
  { value: "serious-case", label: "重大災害事例" },
  { value: "notice", label: "通達・告示" },
  { value: "media", label: "報道" },
];

// 業種ラベル（law-revision-list.tsx の INDUSTRY_OPTIONS と揃える）
const INDUSTRY_LABEL: Record<IndustryTag, string> = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  forestry: "林業",
  food: "食品",
  retail: "小売",
  cleaning: "清掃",
  chemical: "化学",
  electrical: "電気",
};

export function WhatsNewClient({ items }: { items: NewsHubItem[] }) {
  const [selected, setSelected] = useState<NewsHubCategory | "all">("all");
  const [industry, setIndustry] = useState<IndustryTag | "all">("all");
  // 「新着のみ」＝前回閲覧以降（lastVisit 未取得時は30日以内）に絞る
  const [newOnly, setNewOnly] = useState(false);
  // 前回閲覧日（localStorage）。これより新しい項目に「新着」バッジを付ける。
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // マイクロタスクへ遅延し、effect内の同期setStateによるカスケード再描画を避ける
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const prev = window.localStorage.getItem(LAST_VISIT_KEY);
        setLastVisit(prev);
        const today = new Date().toISOString().slice(0, 10);
        window.localStorage.setItem(LAST_VISIT_KEY, today);
      } catch {
        // localStorage 不可環境では新着判定を 30日以内にフォールバック
        setLastVisit(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterNewsHubItems(items, { category: selected, industry, newOnly, lastVisit }),
    [items, selected, industry, newOnly, lastVisit],
  );

  const newCount = useMemo(
    () => items.filter((i) => isNewSince(i, lastVisit)).length,
    [items, lastVisit],
  );

  // 業種フィルタが実際に件数を絞れる業種だけチップにする（タグ付き法改正が無い業種は出さない）
  const availableIndustries = useMemo<IndustryTag[]>(() => {
    const taggedOnly = items.filter((i) => i.industries && i.industries.length > 0);
    return ALL_INDUSTRY_TAGS.filter((tag) =>
      taggedOnly.some((i) => i.industries!.includes(tag)),
    );
  }, [items]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600" aria-live="polite">
        新着 <span className="font-bold text-emerald-700">{newCount}</span> 件
        （前回ご覧になった以降）。すべて出典リンク付き。最終確認は公式でお願いします。
      </p>

      {/* 毎朝の確認を速くする1タップ絞り込み（鮮度） */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setNewOnly((v) => !v)}
          aria-pressed={newOnly}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
            newOnly
              ? "bg-emerald-600 text-white shadow-sm"
              : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          🆕 新着のみ
          <span className={newOnly ? "text-emerald-50" : "text-emerald-600"}>({newCount})</span>
        </button>
        {(newOnly || selected !== "all" || industry !== "all") && (
          <button
            type="button"
            onClick={() => {
              setNewOnly(false);
              setSelected("all");
              setIndustry("all");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            絞り込み解除
          </button>
        )}
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="カテゴリフィルタ">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setSelected(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selected === f.value
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 業種フィルタ（法改正を業種で絞る。事故速報・通達など業種非依存は常に表示） */}
      {availableIndustries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="業種フィルタ">
          <span className="text-xs font-semibold text-slate-500">業種で絞る:</span>
          <button
            type="button"
            onClick={() => setIndustry("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              industry === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            すべて
          </button>
          {availableIndustries.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setIndustry(tag)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                industry === tag
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {INDUSTRY_LABEL[tag]}
            </button>
          ))}
        </div>
      )}

      {industry !== "all" && (
        <p className="text-xs text-slate-500">
          「{INDUSTRY_LABEL[industry]}」に関係する法改正＋業種を問わない速報・通達を表示中。
        </p>
      )}

      {/* 時系列リスト */}
      <ul className="space-y-2">
        {filtered.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-emerald-300"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${CATEGORY_STYLE[item.category]}`}>
                {NEWS_HUB_CATEGORY_LABEL[item.category]}
              </span>
              {item.badge && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  {item.badge}
                </span>
              )}
              {isNewSince(item, lastVisit) && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  新着
                </span>
              )}
              <span className="text-[11px] text-slate-500">{item.date}</span>
            </div>
            <h2 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h2>
            {item.summary && <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.summary}</p>}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-700 hover:underline"
              >
                公式情報を見る →
              </a>
              {item.internalHref && (
                <Link href={item.internalHref} className="font-semibold text-emerald-700 hover:underline">
                  サイト内で詳しく →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {newOnly
            ? "前回ご覧になった以降の新着はありません。"
            : "該当する新着情報はありません。"}
        </p>
      )}
    </div>
  );
}
