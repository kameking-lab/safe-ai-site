"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Filter,
  Languages,
  Search,
} from "lucide-react";
import {
  SAFETY_IMAGE_CATEGORIES,
  type SafetyImageCategory,
  type SafetyImageLibraryCardTheme,
  type SafetyImageUse,
} from "@/data/safety-image-library/client-metadata";
import { isLibraryPath, listStorageKey, RETURN_PATH_KEY } from "./library-navigation";

type SortMode = "recommended" | "order" | "new";
type QuickFilter =
  | "all"
  | "recommended"
  | "ppe"
  | "prohibition"
  | "heavy"
  | "multilingual"
  | "numeric";
const QUICK_FILTER_LABELS: Record<Exclude<QuickFilter, "all">, string> = {
  recommended: "よく使う看板",
  ppe: "保護具",
  prohibition: "立入・禁止",
  heavy: "重機・吊り荷",
  multilingual: "多言語優先",
  numeric: "数値編集",
};

const USES: readonly SafetyImageUse[] = [
  "掲示",
  "報告書",
  "施工計画",
  "教育",
  "朝礼",
];
export function SafetyImageLibraryClient({
  themes,
  initialCategory = "all",
}: {
  themes: readonly SafetyImageLibraryCardTheme[];
  initialCategory?: SafetyImageCategory | "all";
}) {
  const pathname = usePathname();
  const [restored, setRestored] = useState(false);
  const leaving = useRef(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SafetyImageCategory | "all">(
    initialCategory,
  );
  const [use, setUse] = useState<SafetyImageUse | "all">("all");
  const [signFormat, setSignFormat] = useState("all");
  const [numericOnly, setNumericOnly] = useState(false);
  const [documentOnly, setDocumentOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (!isLibraryPath(pathname)) return;
    let cancelled = false;
    let savedScroll = 0;
    const hydrate = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(listStorageKey(pathname));
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, unknown>;
          if (typeof saved.query === "string") setQuery(saved.query.slice(0, 200));
          if (saved.category === "all" || SAFETY_IMAGE_CATEGORIES.some((item) => item.id === saved.category)) setCategory(saved.category as SafetyImageCategory | "all");
          if (saved.use === "all" || USES.includes(saved.use as SafetyImageUse)) setUse(saved.use as SafetyImageUse | "all");
          if (saved.signFormat === "all" || themes.some((theme) => theme.signFormat === saved.signFormat)) setSignFormat(saved.signFormat as string);
          if (typeof saved.numericOnly === "boolean") setNumericOnly(saved.numericOnly);
          if (typeof saved.documentOnly === "boolean") setDocumentOnly(saved.documentOnly);
          if (["all", "recommended", "ppe", "prohibition", "heavy", "multilingual", "numeric"].includes(saved.quickFilter as string)) setQuickFilter(saved.quickFilter as QuickFilter);
          if (["recommended", "order", "new"].includes(saved.sort as string)) setSort(saved.sort as SortMode);
          if (typeof saved.visibleCount === "number" && Number.isInteger(saved.visibleCount) && saved.visibleCount >= 20 && saved.visibleCount <= 100) setVisibleCount(saved.visibleCount);
          if (typeof saved.scrollY === "number" && Number.isFinite(saved.scrollY)) savedScroll = Math.max(0, Math.min(saved.scrollY, 100000));
        }
      } catch {
        // Malformed or unavailable session storage falls back to ordinary filters.
      }
      if (savedScroll === 0) {
        setRestored(true);
        return;
      }
      let attempts = 0;
      const restoreScroll = () => {
        if (cancelled) return;
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maximum >= savedScroll || attempts > 30) {
          window.scrollTo({ top: savedScroll, left: 0, behavior: "instant" });
          setRestored(true);
          return;
        }
        attempts += 1;
        window.setTimeout(restoreScroll, 30);
      };
      // Allow the saved result count to render before restoring a deep position.
      window.setTimeout(restoreScroll, 80);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(hydrate);
    };
  }, [pathname, themes]);

  const persist = useCallback(() => {
    if (!restored || leaving.current || !isLibraryPath(pathname)) return;
    try {
      window.sessionStorage.setItem(listStorageKey(pathname), JSON.stringify({
        query, category, use, signFormat, numericOnly, documentOnly,
        quickFilter, sort, visibleCount, scrollY: window.scrollY,
      }));
    } catch {
      // Browsers can disable session storage; navigation remains usable.
    }
  }, [restored, pathname, query, category, use, signFormat, numericOnly, documentOnly, quickFilter, sort, visibleCount]);

  useEffect(() => {
    persist();
    window.addEventListener("scroll", persist, { passive: true });
    return () => window.removeEventListener("scroll", persist);
  }, [persist]);

  const rememberBeforeDetail = () => {
    persist();
    try { window.sessionStorage.setItem(RETURN_PATH_KEY, pathname); } catch { /* ordinary hub link still works */ }
    leaving.current = true;
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ja");
    const matches = themes.filter((theme) => {
      const searchable = [
        theme.title,
        theme.slug,
        theme.categoryLabel,
        theme.signFormat,
        theme.commonWording,
        ...theme.tags,
        ...Object.values(theme.texts),
      ]
        .join(" ")
        .toLocaleLowerCase("ja");
      if (normalized && !searchable.includes(normalized)) return false;
      if (category !== "all" && theme.category !== category) return false;
      if (use !== "all" && !theme.uses.includes(use)) return false;
      if (signFormat !== "all" && theme.signFormat !== signFormat) return false;
      if (numericOnly && !theme.editableNumber) return false;
      if (
        documentOnly &&
        !theme.uses.some((item) => item === "施工計画" || item === "報告書")
      )
        return false;
      if (quickFilter === "recommended" && !theme.recommended) return false;
      if (quickFilter === "ppe" && theme.category !== "protective-equipment")
        return false;
      if (
        quickFilter === "prohibition" &&
        theme.category !== "entry-prohibition"
      )
        return false;
      if (
        quickFilter === "heavy" &&
        !(
          theme.category === "hazard-warning" &&
          /重機|吊り|荷/u.test(searchable)
        )
      )
        return false;
      if (
        quickFilter === "multilingual" &&
        theme.multilingualPriority !== "high"
      )
        return false;
      if (quickFilter === "numeric" && !theme.editableNumber) return false;
      return true;
    });
    return [...matches].sort((left, right) => {
      if (sort === "new") return right.order - left.order;
      if (sort === "recommended" && left.recommended !== right.recommended) {
        return left.recommended ? -1 : 1;
      }
      return left.order - right.order;
    });
  }, [
    category,
    documentOnly,
    numericOnly,
    query,
    quickFilter,
    signFormat,
    sort,
    themes,
    use,
  ]);

  const visible = filtered.slice(0, visibleCount);
  const hasConditions = Boolean(
    query || category !== "all" || use !== "all" || signFormat !== "all" ||
    numericOnly || documentOnly || quickFilter !== "all" || sort !== "recommended",
  );
  const hiddenConditionLabels = [
    quickFilter !== "all" ? QUICK_FILTER_LABELS[quickFilter] : null,
    signFormat !== "all" ? signFormat : null,
    use !== "all" ? use : null,
    numericOnly ? "数値を編集できる" : null,
    documentOnly ? "施工計画・報告書向け" : null,
    sort === "new" ? "新着順" : sort === "order" ? "登録順" : null,
  ].filter((label): label is string => label !== null);
  const updateFilter = (callback: () => void) => {
    callback();
    setVisibleCount(20);
  };
  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setUse("all");
    setSignFormat("all");
    setNumericOnly(false);
    setDocumentOnly(false);
    setQuickFilter("all");
    setSort("recommended");
    setVisibleCount(20);
  };

  return (
    <section aria-labelledby="library-results-heading">
      <div
        data-safety-sign-filters
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(18rem,1.5fr)_minmax(10rem,.5fr)]">
          <label className="relative block">
            <span className="sr-only">安全画像をキーワード検索</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) =>
                updateFilter(() => setQuery(event.target.value))
              }
              placeholder="例：ヘルメット、足場、熱中症"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-base font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <FilterSelect
            label="カテゴリ"
            value={category}
            onChange={(value) =>
              updateFilter(() =>
                setCategory(value as SafetyImageCategory | "all"),
              )
            }
            options={SAFETY_IMAGE_CATEGORIES.map((item) => ({
              value: item.id,
              label: item.shortLabel,
            }))}
          />
        </div>
        {hasConditions ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-emerald-900 dark:text-emerald-200">
            <span>条件あり</span>
            {hiddenConditionLabels.length ? <span>詳細: {hiddenConditionLabels.join("・")}</span> : null}
            <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg px-2 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">絞り込みを解除</button>
          </div>
        ) : null}
        <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-black text-slate-800 dark:text-slate-100">詳細条件{hasConditions ? "（条件あり）" : ""}</summary>
          <div className="pb-3">
        <div className="flex flex-wrap gap-2" aria-label="よく使う絞り込み">
          {[
            ["recommended", "よく使う看板"],
            ["ppe", "保護具"],
            ["prohibition", "立入・禁止"],
            ["heavy", "重機・吊り荷"],
            ["multilingual", "多言語優先"],
            ["numeric", "数値編集"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={quickFilter === value}
              onClick={() =>
                updateFilter(() =>
                  setQuickFilter((current) =>
                    current === value ? "all" : (value as QuickFilter),
                  ),
                )
              }
              className={`min-h-11 rounded-full border px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                quickFilter === value
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="看板形式"
            value={signFormat}
            onChange={(value) => updateFilter(() => setSignFormat(value))}
            options={[...new Set(themes.map((theme) => theme.signFormat))]
              .sort()
              .map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="用途"
            value={use}
            onChange={(value) =>
              updateFilter(() => setUse(value as SafetyImageUse | "all"))
            }
            options={USES.map((item) => ({ value: item, label: item }))}
          />
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input
              type="checkbox"
              checked={numericOnly}
              onChange={(event) =>
                updateFilter(() => setNumericOnly(event.target.checked))
              }
              className="h-5 w-5 accent-emerald-800"
            />
            数値を編集できる
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input
              type="checkbox"
              checked={documentOnly}
              onChange={(event) =>
                updateFilter(() => setDocumentOnly(event.target.checked))
              }
              className="h-5 w-5 accent-emerald-800"
            />
            施工計画・報告書向け
          </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            並び順
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-bold dark:border-slate-700 dark:bg-slate-900">
              <option value="recommended">おすすめ順</option>
              <option value="order">登録順</option>
              <option value="new">新着順</option>
            </select>
          </label>
          </div>
        </details>
      </div>
      <noscript>
        <style>{`[data-safety-sign-filters]{display:none!important}`}</style>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-slate-900">
          <p className="font-bold">
            JavaScript無効時は、次の通常リンクから公開中の100点を選べます。
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {themes.map((theme) => (
              <li key={theme.slug}>
                <Link
                  className="font-bold underline underline-offset-4"
                  href={theme.detailPath}
                >
                  {theme.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </noscript>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
            検索結果 {filtered.length}点
          </p>
          <h2
            id="library-results-heading"
            className="mt-1 text-2xl font-black text-slate-950 dark:text-white"
          >
            看板から選ぶ
          </h2>
        </div>
      </div>

      {visible.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((theme, index) => (
            <article
              key={theme.slug}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
            >
              <Link
                href={`${theme.detailPath}?fromLibrary=1`}
                onClick={rememberBeforeDetail}
                className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-300"
              >
                <div
                  className={`relative overflow-hidden bg-slate-100 ${theme.orientation === "portrait" ? "aspect-[4/5]" : theme.orientation === "square" ? "aspect-square" : "aspect-[3/2]"}`}
                >
                  <Image
                    src={theme.previewPath}
                    alt={`${theme.title}を表す、文字なしの安全AIポータル作成イラスト`}
                    fill
                    priority={index < 4}
                    loading={index < 4 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 94vw, (max-width: 1280px) 46vw, 24vw"
                    className="object-contain transition duration-300 group-hover:scale-[1.02]"
                  />
                  {theme.recommended ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-900/95 px-2.5 py-1 text-xs font-black text-white shadow">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      おすすめ
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                    {theme.categoryLabel}
                  </p>
                  <h3 className="mt-1 text-lg font-black leading-7 text-slate-950 dark:text-white">
                    {theme.title}
                  </h3>
                  <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {theme.signFormat}・{theme.recommendedSize}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Languages className="h-4 w-4" aria-hidden="true" />
                    5言語・縦横選択・{theme.editableNumber ? "数値編集" : "文字編集"}
                  </p>
                  <span className="mt-3 inline-flex min-h-11 items-center gap-1 font-black text-emerald-800 dark:text-emerald-300">
                    看板を開く <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="font-black text-slate-800 dark:text-slate-100">
            条件に合う画像がありません。
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 min-h-11 rounded-lg bg-emerald-800 px-5 text-sm font-black text-white"
          >
            絞り込みを解除
          </button>
        </div>
      )}

      {visibleCount < filtered.length ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 20)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-800 bg-white px-7 font-black text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-slate-950 dark:text-emerald-200"
          >
            次の20点を表示 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-black text-slate-600 dark:text-slate-300">
      <span className="mb-1 flex items-center gap-1">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <option value="all">すべて</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
