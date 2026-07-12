"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Factory,
  FileText,
  FlaskConical,
  HardHat,
  HeartPulse,
  LayoutGrid,
  Newspaper,
  Scale,
  Siren,
  SprayCan,
  Store,
  TreePine,
  Truck,
  Utensils,
  Zap,
} from "lucide-react";
import {
  type NewsHubItem,
  type NewsHubCategory,
  NEWS_HUB_CATEGORY_LABEL,
  isNewSince,
  filterNewsHubItems,
} from "@/lib/news-hub-types";
import { computeWhatsNewConclusion } from "@/lib/news-conclusions";
import { type IndustryTag, ALL_INDUSTRY_TAGS } from "@/lib/types/domain";
import { ConclusionCard } from "@/components/ui/conclusion-card";

const LAST_VISIT_KEY = "anzen_whatsnew_last_visit_v1";
// 業種の選択を記憶する＝次回から開いた瞬間に「自分に関係あるもの」だけが出る
const INDUSTRY_KEY = "anzen_whatsnew_industry_v1";
// 柱C-6: 初期表示件数（全件積み上げで47画面スクロールにしない）
const INITIAL_COUNT = 30;

const CATEGORY_STYLE: Record<NewsHubCategory, string> = {
  "law-revision": "bg-indigo-100 text-indigo-800",
  accident: "bg-rose-100 text-rose-800",
  notice: "bg-sky-100 text-sky-800",
  media: "bg-slate-100 text-slate-700",
  "serious-case": "bg-orange-100 text-orange-800",
};

// アイコンファーストのカテゴリチップ: 選択時はカテゴリ固有色の塗り（バッジと同じ色文法）
const FILTERS: {
  value: NewsHubCategory | "all";
  label: string;
  icon: LucideIcon;
  selected: string;
  idle: string;
}[] = [
  { value: "all", label: "すべて", icon: LayoutGrid, selected: "bg-slate-700 text-white", idle: "border border-slate-300 bg-white text-slate-700" },
  { value: "law-revision", label: "法改正", icon: Scale, selected: "bg-indigo-600 text-white", idle: "border border-indigo-200 bg-white text-indigo-800" },
  { value: "accident", label: "事故速報", icon: Siren, selected: "bg-rose-600 text-white", idle: "border border-rose-200 bg-white text-rose-800" },
  { value: "serious-case", label: "重大災害", icon: AlertTriangle, selected: "bg-orange-600 text-white", idle: "border border-orange-200 bg-white text-orange-800" },
  { value: "notice", label: "通達告示", icon: FileText, selected: "bg-sky-700 text-white", idle: "border border-sky-200 bg-white text-sky-800" },
  { value: "media", label: "報道", icon: Newspaper, selected: "bg-slate-600 text-white", idle: "border border-slate-300 bg-white text-slate-700" },
];

// 業種ラベル＋ピクトグラム（law-revision-list.tsx の INDUSTRY_OPTIONS とラベルを揃える）
const INDUSTRY_META: Record<IndustryTag, { label: string; icon: LucideIcon }> = {
  construction: { label: "建設", icon: HardHat },
  manufacturing: { label: "製造", icon: Factory },
  healthcare: { label: "医療福祉", icon: HeartPulse },
  transport: { label: "運輸", icon: Truck },
  forestry: { label: "林業", icon: TreePine },
  food: { label: "食品", icon: Utensils },
  retail: { label: "小売", icon: Store },
  cleaning: { label: "清掃", icon: SprayCan },
  chemical: { label: "化学", icon: FlaskConical },
  electrical: { label: "電気", icon: Zap },
};

function isIndustryTag(v: string | null): v is IndustryTag {
  return !!v && (ALL_INDUSTRY_TAGS as readonly string[]).includes(v);
}

export function WhatsNewClient({ items }: { items: NewsHubItem[] }) {
  const [selected, setSelected] = useState<NewsHubCategory | "all">("all");
  const [industry, setIndustry] = useState<IndustryTag | "all">("all");
  // 「新着のみ」＝前回閲覧以降（lastVisit 未取得時は30日以内）に絞る
  const [newOnly, setNewOnly] = useState(false);
  // 前回閲覧日（localStorage）。これより新しい項目に「新着」バッジを付ける。
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
        // 前回選んだ業種を復元（「自分に関係あるか」が開いた瞬間に分かる）
        const savedIndustry = window.localStorage.getItem(INDUSTRY_KEY);
        if (isIndustryTag(savedIndustry)) setIndustry(savedIndustry);
      } catch {
        // localStorage 不可環境では新着判定を 30日以内にフォールバック
        setLastVisit(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectIndustry = (tag: IndustryTag | "all") => {
    setIndustry(tag);
    setShowAll(false);
    try {
      if (tag === "all") window.localStorage.removeItem(INDUSTRY_KEY);
      else window.localStorage.setItem(INDUSTRY_KEY, tag);
    } catch {
      // 保存できなくても絞り込み自体は機能する
    }
  };

  const filtered = useMemo(
    () => filterNewsHubItems(items, { category: selected, industry, newOnly, lastVisit }),
    [items, selected, industry, newOnly, lastVisit],
  );
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hiddenCount = filtered.length - visible.length;

  const conclusion = useMemo(
    () => computeWhatsNewConclusion(items, lastVisit),
    [items, lastVisit],
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
    <div className="space-y-3">
      {/* 柱0: 結論ファースト＝開いた瞬間「いまの状態」1メッセージ */}
      <ConclusionCard
        tone={conclusion.tone}
        value={conclusion.value}
        unit={conclusion.unit}
        title={conclusion.title}
        description={conclusion.description}
        action={
          conclusion.tone === "warning"
            ? { href: "/laws", label: "改正を確認" }
            : conclusion.tone === "info"
              ? { href: "#news-list", label: "新着を見る" }
              : undefined
        }
      />

      {/* 毎朝の確認を速くする1タップ絞り込み（鮮度） */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setNewOnly((v) => !v);
            setShowAll(false);
          }}
          aria-pressed={newOnly}
          className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-4 text-xs font-bold transition ${
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
              selectIndustry("all");
            }}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            絞り込み解除
          </button>
        )}
      </div>

      {/* カテゴリフィルタ（アイコンファースト・横スクロール1行でファーストビューを守る） */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="group"
        aria-label="カテゴリフィルタ"
      >
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = selected === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setSelected(f.value);
                setShowAll(false);
              }}
              aria-pressed={active}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition ${
                active ? `${f.selected} shadow-sm` : `${f.idle} hover:bg-slate-50`
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 業種フィルタ（法改正を業種で絞る。事故速報・通達など業種非依存は常に表示。選択は記憶） */}
      {availableIndustries.length > 0 && (
        <div
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1"
          role="group"
          aria-label="業種フィルタ"
        >
          <span className="shrink-0 text-xs font-semibold text-slate-500">業種:</span>
          <button
            type="button"
            onClick={() => selectIndustry("all")}
            aria-pressed={industry === "all"}
            className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3.5 text-xs font-bold transition ${
              industry === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            すべて
          </button>
          {availableIndustries.map((tag) => {
            const meta = INDUSTRY_META[tag];
            const Icon = meta.icon;
            const active = industry === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => selectIndustry(tag)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {industry !== "all" && (
        <p className="text-xs text-slate-500">
          「{INDUSTRY_META[industry].label}」に関係する法改正＋業種を問わない速報・通達を表示中（次回も記憶されます）。
        </p>
      )}

      {/* 時系列リスト */}
      <ul id="news-list" className="space-y-2">
        {visible.map((item) => (
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
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          もっと見る（残り {hiddenCount} 件）
        </button>
      )}
      {filtered.length === 0 && (
        <EmptyState
          title={newOnly ? "前回ご覧になった以降の新着はありません" : "該当する新着情報はありません"}
        />
      )}
    </div>
  );
}
