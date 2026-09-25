"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import {
  generateAmazonHighRatedSearchUrl,
  generateRakutenSearchUrl,
} from "@/lib/affiliate-url";
import { trackEvent } from "@/components/Analytics";
import {
  PUBLIC_GOODS_RATING_DISCLOSURE,
  PUBLIC_SAFETY_GOODS_CATEGORIES,
} from "@/data/public-safety-goods-categories";
import { FeatureMascotCompanion } from "@/components/feature-mascot-companion";
import { NetisSafetyGuide } from "@/components/netis-safety-guide";
import { SafetyGoodsWizard } from "@/components/safety-goods-wizard";
import { GoodsProductCarousel } from "@/components/goods-product-carousel";
import { GOODS_PRODUCT_FEATURES, getGoodsProductFeature } from "@/data/goods-product-features";

const OFFICIAL_SELECTION_SOURCES = [
  {
    label: "墜落制止用器具の規格（厚生労働省告示第11号）",
    href: "https://www.mhlw.go.jp/web/t_doc?dataId=74ab6770&dataType=0&pageNo=1",
  },
  {
    label: "騒音障害防止のためのガイドライン（厚生労働省）",
    href: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1",
  },
  {
    label: "皮膚障害等防止用保護具の選定マニュアル 第3版（厚生労働省）",
    href: "https://www.mhlw.go.jp/content/11300000/001670143.pdf",
  },
  {
    label: "化学物質による労働災害防止のための新たな規制（厚生労働省）",
    href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
  },
] as const;

function affiliateClick(
  platform: "amazon" | "rakuten",
  categoryId: string,
  categoryName: string,
) {
  trackEvent("affiliate_click", {
    platform,
    product_id: `category-${categoryId}`,
    product_name: categoryName,
    page_location: "goods_category_directory",
  });
}

const GOODS_CATEGORY_EVENT = "goods-category-change";
type CategoryGroup = "ppe" | "support" | "all";
type RespiratoryIntent = "dust" | "gas" | "supplied" | "unknown";
type GoodsDirectoryState = { group: CategoryGroup; query: string; lastCategory: string | null; lastEntry: string | null };

type GoodsDirectoryEntry = {
  id: string;
  category: (typeof PUBLIC_SAFETY_GOODS_CATEGORIES)[number];
  name: string;
  detail?: string;
  image: string;
  intent?: RespiratoryIntent;
  searchText: string;
};

const RESPIRATORY_ENTRY_INTENTS = ["dust", "gas", "supplied", "unknown"] as const;
const RESPIRATORY_SAFETY_CHECKS = [
  ["oxygen", "酸素濃度を測定し、酸素欠乏のおそれがない"],
  ["substance", "対象物質名をSDS等で確定している"],
  ["concentration", "実際のばく露濃度を確認している"],
  ["mixture", "粉じんとガス・蒸気が混在していないことを確認した"],
  ["emergency", "緊急・救助用途ではない"],
  ["supplied", "給気式を専門担当者と検討すべき条件ではない"],
] as const;
const REQUIRED_RESPIRATORY_SAFETY = RESPIRATORY_SAFETY_CHECKS.map(([id]) => id).join(",");
const RESPIRATORY_DIRECTORY_ENTRIES: readonly GoodsDirectoryEntry[] = [
  {
    id: "respiratory-dust",
    category: PUBLIC_SAFETY_GOODS_CATEGORIES.find((category) => category.id === "respiratory")!,
    name: "防じんマスク",
    detail: "粉じん・ヒューム・ミスト",
    image: "/safety-images/library/previews/dust-mask-required.webp",
    intent: "dust",
    searchText: "呼吸用保護具 呼吸用 送気 空気呼吸器 防じん 防塵 マスク 粉じん ヒューム ミスト 研削 解体 清掃",
  },
  {
    id: "respiratory-gas",
    category: PUBLIC_SAFETY_GOODS_CATEGORIES.find((category) => category.id === "respiratory")!,
    name: "防毒マスク",
    detail: "ガス・蒸気",
    image: "/safety-images/library/previews/respiratory-protection-required.webp",
    intent: "gas",
    searchText: "呼吸用保護具 呼吸用 送気 空気呼吸器 防毒 マスク ガス 蒸気 有機溶剤 塗装 洗浄 接着",
  },
] as const;

const GOODS_DIRECTORY_ENTRIES: readonly GoodsDirectoryEntry[] = PUBLIC_SAFETY_GOODS_CATEGORIES.flatMap((category) =>
  category.id === "respiratory"
    ? RESPIRATORY_DIRECTORY_ENTRIES
    : [{ id: category.id, category, name: category.name, image: category.image, searchText: `${category.name} ${category.keywords ?? ""} ${category.searchQuery}` }],
);

function isDirectoryEntryId(value: unknown): value is string {
  return typeof value === "string" && GOODS_DIRECTORY_ENTRIES.some((entry) => entry.id === value);
}

function readDirectoryState(): GoodsDirectoryState | null {
  const state = window.history.state;
  const directory = state && typeof state === "object" ? state.goodsDirectory : null;
  if (!directory || typeof directory !== "object") return null;
  if (directory.group !== "ppe" && directory.group !== "support" && directory.group !== "all") return null;
  if (typeof directory.query !== "string" || directory.query.length > 80) return null;
  return {
    group: directory.group,
    query: directory.query,
    lastCategory: typeof directory.lastCategory === "string" && PUBLIC_SAFETY_GOODS_CATEGORIES.some((category) => category.id === directory.lastCategory) ? directory.lastCategory : null,
    lastEntry: isDirectoryEntryId(directory.lastEntry) ? directory.lastEntry : null,
  };
}

function writeDirectoryState(directory: GoodsDirectoryState) {
  const state = window.history.state;
  window.history.replaceState({ ...(state && typeof state === "object" ? state : {}), goodsDirectory: directory }, "", window.location.href);
}

function subscribeCategory(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(GOODS_CATEGORY_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(GOODS_CATEGORY_EVENT, listener);
  };
}

function currentCategory() {
  const id = new URLSearchParams(window.location.search).get("category");
  return PUBLIC_SAFETY_GOODS_CATEGORIES.some((category) => category.id === id) ? id : null;
}

function currentFeature() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get("category") ?? "";
  const featureId = params.get("feature");
  const intent = params.get("intent");
  if (categoryId === "respiratory" && !featureId && (intent === "supplied" || intent === "unknown")) return intent;
  if (categoryId === "respiratory" && (featureId === "dust" || featureId === "gas")) {
    if (params.get("intent") !== featureId || params.get("conditions") !== "confirmed" || params.get("safety") !== REQUIRED_RESPIRATORY_SAFETY) return null;
  }
  return getGoodsProductFeature(categoryId, featureId)?.id ?? null;
}

function currentRespiratorySafety() {
  return new URLSearchParams(window.location.search).get("safety") ?? "";
}

function currentRespiratoryIntent(): RespiratoryIntent | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("category") !== "respiratory") return null;
  const intent = params.get("intent");
  return RESPIRATORY_ENTRY_INTENTS.includes(intent as RespiratoryIntent) ? intent as RespiratoryIntent : null;
}

export function SafetyGoodsPanel() {
  const [categoryGroup, setCategoryGroup] = useState<CategoryGroup>("ppe");
  const [categoryQuery, setCategoryQuery] = useState("");
  const selectedCategoryId = useSyncExternalStore(subscribeCategory, currentCategory, () => null);
  const selectedFeatureId = useSyncExternalStore(subscribeCategory, currentFeature, () => null);
  const respiratoryIntent = useSyncExternalStore(subscribeCategory, currentRespiratoryIntent, () => null);
  const respiratorySafety = useSyncExternalStore(subscribeCategory, currentRespiratorySafety, () => "");
  const respiratorySafetySet = new Set(respiratorySafety.split(",").filter(Boolean));
  const respiratorySafetyComplete = respiratorySafety === REQUIRED_RESPIRATORY_SAFETY;
  const selectedCategory = PUBLIC_SAFETY_GOODS_CATEGORIES.find((category) => category.id === selectedCategoryId);
  const featureOptions = selectedCategory ? GOODS_PRODUCT_FEATURES[selectedCategory.id] : undefined;
  const selectedFeature = selectedCategory ? getGoodsProductFeature(selectedCategory.id, selectedFeatureId) : null;
  const normalizedQuery = categoryQuery.normalize("NFKC").trim().toLowerCase();
  const visibleCategories = GOODS_DIRECTORY_ENTRIES.filter((entry) => {
    if (categoryGroup !== "all" && entry.category.group !== categoryGroup) return false;
    return !normalizedQuery || entry.searchText.normalize("NFKC").toLowerCase().includes(normalizedQuery);
  });
  const lastCategory = useRef<string | null>(null);
  const lastEntry = useRef<string | null>(null);

  useEffect(() => {
    const saved = readDirectoryState();
    if (saved) {
      setCategoryGroup(saved.group);
      setCategoryQuery(saved.query);
      lastCategory.current = saved.lastCategory;
      lastEntry.current = saved.lastEntry;
    } else {
      const category = PUBLIC_SAFETY_GOODS_CATEGORIES.find((item) => item.id === currentCategory());
      if (category) setCategoryGroup(category.group);
    }
  }, []);

  function updateDirectory(group: CategoryGroup, query: string, category = lastCategory.current, entry = lastEntry.current) {
    setCategoryGroup(group);
    setCategoryQuery(query);
    writeDirectoryState({ group, query, lastCategory: category, lastEntry: entry });
  }

  useEffect(() => {
    const targetId = selectedCategoryId ? "goods-product-panel" : lastEntry.current ? `goods-choice-${lastEntry.current}` : lastCategory.current ? `goods-choice-${lastCategory.current}` : null;
    if (selectedCategoryId) lastCategory.current = selectedCategoryId;
    if (!targetId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId) ?? document.getElementById("goods-category-search");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (selectedCategoryId !== "respiratory") return;
    const frame = window.requestAnimationFrame(() => {
      const target = respiratoryIntent
        ? document.getElementById(`goods-respiratory-intent-${respiratoryIntent}`)
        : document.getElementById("goods-respiratory-intents");
      target?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [respiratoryIntent, selectedCategoryId]);

  function selectCategory(categoryId: string, intent?: RespiratoryIntent, entryId = categoryId) {
    lastCategory.current = categoryId;
    lastEntry.current = entryId;
    writeDirectoryState({ group: categoryGroup, query: categoryQuery, lastCategory: categoryId, lastEntry: entryId });
    const url = new URL(window.location.href);
    url.searchParams.set("category", categoryId);
    url.searchParams.delete("feature");
    url.searchParams.delete("conditions");
    url.searchParams.delete("safety");
    if (intent) url.searchParams.set("intent", intent);
    else url.searchParams.delete("intent");
    window.history.pushState({ goodsCategoryFromDirectory: true, goodsDirectory: readDirectoryState() }, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
  }

  function selectFeature(featureId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("feature", featureId);
    if (selectedCategoryId === "respiratory") {
      if (featureId === "dust" || featureId === "gas") {
        url.searchParams.set("intent", featureId);
        url.searchParams.set("conditions", "confirmed");
        url.searchParams.set("safety", REQUIRED_RESPIRATORY_SAFETY);
      } else {
        url.searchParams.delete("conditions");
        url.searchParams.delete("safety");
      }
    }
    window.history.pushState({ goodsFeatureFromCategory: true, goodsDirectory: readDirectoryState() }, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
    window.requestAnimationFrame(() => document.getElementById("goods-feature-results")?.scrollIntoView({ block: "start", behavior: "instant" }));
  }

  function returnToFeatures() {
    const url = new URL(window.location.href);
    url.searchParams.delete("feature");
    url.searchParams.delete("conditions");
    url.searchParams.delete("safety");
    window.history.pushState({ goodsDirectory: readDirectoryState() }, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
  }

  function returnToRespiratoryKinds() {
    const url = new URL(window.location.href);
    url.searchParams.delete("feature");
    url.searchParams.delete("intent");
    url.searchParams.delete("conditions");
    url.searchParams.delete("safety");
    window.history.pushState({ goodsDirectory: readDirectoryState() }, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
    window.requestAnimationFrame(() => document.getElementById("goods-respiratory-intents")?.focus({ preventScroll: true }));
  }

  function returnToCategories() {
    const saved = readDirectoryState();
    if (saved) updateDirectory(saved.group, saved.query, selectedCategory?.id ?? saved.lastCategory, saved.lastEntry);
    else if (selectedCategory) updateDirectory(selectedCategory.group, "", selectedCategory.id, lastEntry.current);
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    url.searchParams.delete("feature");
    url.searchParams.delete("intent");
    url.searchParams.delete("conditions");
    url.searchParams.delete("safety");
    window.history.pushState({ goodsDirectory: readDirectoryState() }, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-emerald-700">作業から選べる購入入口</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          安全用品・保護具を、迷わず選ぶ
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
          「何から見ればいい？」を、危険・作業・現場条件の順に整理。
          そのまま購入候補と公式資料へ進めます。
        </p>
      </header>

      <section aria-labelledby="goods-categories-title">
        <h2 id="goods-categories-title" className="text-xl font-bold text-slate-950">
          用品カテゴリから実商品を探す
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
          用品を選んで、必要な特徴と商品候補を確認します。カテゴリの画像はイラストです。
        </p>
        <div className={selectedCategory ? "hidden" : "mt-4 space-y-3"}>
          <label htmlFor="goods-category-search" className="block text-sm font-bold text-slate-800">用品名・作業から探す</label>
          <input
            id="goods-category-search"
            type="search"
            value={categoryQuery}
            onChange={(event) => { const query = event.target.value.slice(0, 80); updateDirectory(query.trim() ? "all" : categoryGroup, query); }}
            maxLength={80}
            placeholder="例：ヘルメット、防毒、研削"
            className="min-h-12 w-full max-w-xl rounded-xl border border-slate-400 bg-white px-4 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="用品の分類">
            {([
              ["ppe", "身につける保護具", GOODS_DIRECTORY_ENTRIES.filter((entry) => entry.category.group === "ppe").length],
              ["support", "現場の補助用品", GOODS_DIRECTORY_ENTRIES.filter((entry) => entry.category.group === "support").length],
              ["all", "すべて", GOODS_DIRECTORY_ENTRIES.length],
            ] as const).map(([id, label, count]) => (
              <button key={id} type="button" aria-pressed={categoryGroup === id} onClick={() => updateDirectory(id, categoryQuery)} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${categoryGroup === id ? "border-emerald-800 bg-emerald-900 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-emerald-700"}`}>
                {label} {count}
              </button>
            ))}
          </div>
          <p role="status" aria-live="polite" className="text-sm font-semibold text-slate-700">{visibleCategories.length}つの入口を表示{categoryQuery ? `・「${categoryQuery}」で検索中` : ""}</p>
        </div>
        <ul hidden={Boolean(selectedCategory)} className={selectedCategory ? "hidden" : "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"} aria-label="安全用品カテゴリの画像一覧">
          {visibleCategories.map((entry) => (
            <li key={entry.id} id={`goods-${entry.id}`}>
              <button id={`goods-choice-${entry.id}`} type="button" onClick={() => selectCategory(entry.category.id, entry.intent, entry.id)} className="group flex h-full w-full scroll-mt-24 flex-col items-center rounded-2xl border border-slate-300 bg-white p-3 text-center shadow-sm hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                <span className="relative block h-24 w-full sm:h-28">
                  <Image src={entry.image} alt="" fill sizes="(max-width: 640px) 150px, 180px" className="object-contain" />
                </span>
                <span className="mt-2 text-sm font-bold leading-6 text-slate-950">{entry.name}</span>
                {entry.detail ? <span className="mt-1 text-xs leading-5 text-slate-600">{entry.detail}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        {!selectedCategory && visibleCategories.length === 0 ? <p className="mt-3 text-sm text-slate-700">該当する用品がありません。別の用品名や危険で探してください。</p> : null}
        {selectedCategory ? (
          <div id="goods-product-panel" role="region" tabIndex={-1} aria-label={`${selectedCategory.name}の商品候補`} className="mt-4 scroll-mt-24 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            <button type="button" onClick={returnToCategories} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />用品一覧に戻る
            </button>
            <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold leading-6 text-slate-800">選ぶポイント：{selectedCategory.selectionPrompt}</p>
            {selectedCategory.id === "respiratory" ? (
              <div id="goods-respiratory-intents" tabIndex={-1} className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-800">
                <h3 className="text-lg font-black text-sky-950">呼吸用保護具の種類</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">入口は選定結果ではありません。酸素・物質・濃度を確認してから候補を表示します。</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {([
                    ["dust", "粉じん・ヒューム・ミストを防ぐ", "防じん機能。ガス・蒸気には使えません。"],
                    ["gas", "ガス・蒸気を防ぐ", "防毒機能。対象物質に合う吸収缶が必要です。"],
                    ["supplied", "別の空気を供給する", "送気マスク・空気呼吸器。設備と運用を専門担当者が確認します。"],
                    ["unknown", "何が必要か分からない", "SDS・測定結果・作業条件を確認し、商品を推測しません。"],
                  ] as const).map(([id, label, detail]) => (
                    <button
                      key={id}
                      id={`goods-respiratory-intent-${id}`}
                      type="button"
                      aria-pressed={respiratoryIntent === id}
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("intent", id);
                        url.searchParams.delete("feature");
                        url.searchParams.delete("conditions");
                        url.searchParams.delete("safety");
                        if (id === "supplied" || id === "unknown") url.searchParams.set("feature", id);
                        window.history.pushState({ goodsDirectory: readDirectoryState() }, "", url);
                        window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
                      }}
                      className={`min-h-24 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 ${respiratoryIntent === id ? "border-sky-800 bg-sky-900 text-white" : "border-sky-300 bg-white text-slate-950 hover:border-sky-700"}`}
                    >
                      <span className="block font-bold">{label}</span>
                      <span className={`mt-1 block text-sm ${respiratoryIntent === id ? "text-sky-50" : "text-slate-700"}`}>{detail}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedCategory.id === "respiratory" && (respiratoryIntent === "dust" || respiratoryIntent === "gas") && !selectedFeature ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="text-lg font-black text-emerald-950">次に、6つの安全条件を確認する</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">すべてを個別に確認できた場合だけ商品例へ進めます。未確認は「問題なし」にしません。</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {RESPIRATORY_SAFETY_CHECKS.map(([id, label]) => {
                    const checked = respiratorySafetySet.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => {
                          const next = new Set(respiratorySafetySet);
                          if (checked) next.delete(id); else next.add(id);
                          const ordered = RESPIRATORY_SAFETY_CHECKS.map(([key]) => key).filter((key) => next.has(key));
                          const url = new URL(window.location.href);
                          if (ordered.length) url.searchParams.set("safety", ordered.join(","));
                          else url.searchParams.delete("safety");
                          url.searchParams.delete("feature");
                          url.searchParams.delete("conditions");
                          window.history.replaceState({ goodsDirectory: readDirectoryState() }, "", url);
                          window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
                        }}
                        className={`min-h-16 rounded-xl border p-3 text-left text-sm font-bold ${checked ? "border-emerald-800 bg-emerald-900 text-white" : "border-emerald-300 bg-white text-slate-900 hover:border-emerald-700"}`}
                      >
                        <span aria-hidden="true" className="mr-2">{checked ? "✓" : "□"}</span>{label}
                      </button>
                    );
                  })}
                </div>
                <button type="button" disabled={!respiratorySafetyComplete} onClick={() => selectFeature(respiratoryIntent)} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-800 px-4 text-sm font-black text-white enabled:hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
                  {respiratorySafetyComplete ? "条件を確認して商品例を見る" : `あと${RESPIRATORY_SAFETY_CHECKS.length - respiratorySafetySet.size}項目を確認`}
                </button>
                <div className="mt-4 border-t border-emerald-200 pt-4">
                  <p className="text-sm font-black text-amber-950">確認できない・該当する場合</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([[
                      "mixed", "粉じんとガスが混在",
                    ], ["oxygen", "酸素欠乏のおそれ"], ["concentration-unknown", "物質名・濃度が不明"], ["emergency", "緊急・救助用途"]] as const).map(([id, label]) => (
                      <button key={id} type="button" onClick={() => selectFeature(id)} className="min-h-11 rounded-lg border border-amber-400 bg-amber-50 px-3 text-sm font-bold text-amber-950 hover:bg-amber-100">{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {featureOptions && selectedCategory.id !== "respiratory" && !selectedFeature ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="text-lg font-black text-emerald-950">{selectedCategory.id === "respiratory" ? "次に、安全条件を確認する" : "まず、必要な特徴を選ぶ"}</h3>
                <p className="mt-1 text-sm text-slate-700">{selectedCategory.id === "respiratory" ? "未確認を問題なしとして扱いません。危険条件では通販候補を表示しません。" : "選んだ条件に近い商品を探します。商品ごとの適合はメーカー資料で確認してください。"}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {featureOptions.map((feature) => <button key={feature.id} type="button" onClick={() => selectFeature(feature.id)} className={`min-h-20 rounded-xl border bg-white p-3 text-left hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${respiratoryIntent === feature.id ? "border-emerald-800 ring-2 ring-emerald-200" : "border-emerald-300"}`}><span className="block font-bold text-slate-950">{feature.label}</span><span className="mt-1 block text-sm text-slate-700">{feature.detail}</span></button>)}
                </div>
              </div>
            ) : null}
            {selectedFeature ? <div id="goods-feature-results" className="mt-4 scroll-mt-24 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-black text-emerald-950">選択中: {selectedFeature.label}</p><p className="mt-1 text-sm text-slate-700">{selectedFeature.searchQuery === null ? "商品選定の前に必要なこと" : "購入前の確認"}: {selectedFeature.check}</p>{selectedFeature.officialSource ? <a href={selectedFeature.officialSource.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-emerald-800 underline">{selectedFeature.officialSource.label}で確認<span className="sr-only">（新しいタブで開く）</span></a> : null}<div className="flex flex-wrap gap-4"><button type="button" onClick={returnToFeatures} className="mt-2 min-h-11 text-sm font-bold text-emerald-800 underline">特徴を選び直す</button>{selectedCategory.id === "respiratory" ? <button type="button" onClick={returnToRespiratoryKinds} className="mt-2 min-h-11 text-sm font-bold text-emerald-800 underline">呼吸用保護具の種類に戻る</button> : null}</div></div> : null}
            {(!featureOptions || selectedFeature) && selectedFeature?.searchQuery !== null ? <GoodsProductCarousel key={`${selectedCategory.id}:${selectedFeatureId ?? "all"}`} categoryId={selectedCategory.id} categoryName={selectedCategory.name} featureId={selectedFeatureId ?? undefined} /> : null}
            {(!featureOptions || selectedFeature) && selectedFeature?.searchQuery === null ? <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">対象の物質や作業条件が分かるまで、商品候補は表示しません。SDSなどを確認してから選び直してください。</p> : null}
            {(!featureOptions || selectedFeature?.searchQuery) ? <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-800">販売サイトの一般検索</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">この検索は購入者評価で絞り込まれておらず、当サイトの推薦ではありません。商品ごとの規格・用途・評価を販売先で確認してください。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={generateAmazonHighRatedSearchUrl(selectedFeature?.searchQuery ?? selectedCategory.searchQuery)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("amazon", selectedCategory.id, selectedCategory.name)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-amber-700 px-3 text-sm font-bold text-white hover:bg-amber-800">
                  <Search className="h-4 w-4" aria-hidden="true" />Amazonで一般検索
                </a>
                <a href={generateRakutenSearchUrl(selectedFeature?.searchQuery ?? selectedCategory.searchQuery)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("rakuten", selectedCategory.id, selectedCategory.name)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-rose-700 px-3 text-sm font-bold text-white hover:bg-rose-800">
                  <Search className="h-4 w-4" aria-hidden="true" />楽天で一般検索
                </a>
              </div>
            </div> : null}
          </div>
        ) : null}
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
          検索結果は推奨や適合証明ではありません。APIで取得できた評価のみサイト内に表示します。最新の評価・価格・在庫と安全規格の適合は、販売ページと一次資料で確認してください。商品データ: <a href={PUBLIC_GOODS_RATING_DISCLOSURE.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{PUBLIC_GOODS_RATING_DISCLOSURE.sourceLabel}</a>
        </p>
      </section>

      <FeatureMascotCompanion
        variant="ppe-check"
        eyebrow="装備点検チワワ"
        title="作業に合う道具を、いっしょに絞ろう。"
        message="カテゴリと用途を選んだ後は、製品ごとの規格と装着性まで確認しよう。"
        tone="cream"
        compact
        className="max-w-3xl"
      />

      <SafetyGoodsWizard />

      <NetisSafetyGuide compact />

      <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-labelledby="official-selection-sources">
        <summary className="cursor-pointer list-none text-lg font-bold text-slate-950 marker:hidden">
          <span className="inline-flex items-center gap-2">公式資料を見ながら、もう一度確認する <span aria-hidden="true" className="text-emerald-700 group-open:rotate-90">›</span></span>
        </summary>
        <h2
          id="official-selection-sources"
          className="sr-only"
        >
          選定前に確認する公式一次資料
        </h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {OFFICIAL_SELECTION_SOURCES.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-emerald-500 hover:text-emerald-800"
              >
                <span>{source.label}</span>
                <ExternalLink
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          確認日: 2026年7月24日。資料は対象作業・製品ごとに異なります。リンク先の改訂状況も確認してください。
        </p>
      </details>

      <p className="rounded-xl bg-slate-100 p-4 text-xs leading-6 text-slate-700">
        本ページはアフィリエイトリンクを含みます。リンク先で購入された場合、当サイトに紹介料が支払われることがあります。
        紹介料の有無は、製品の安全性・適合性・掲載順の評価根拠には使用していません。
      </p>
    </div>
  );
}
