"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Filter,
  Languages,
  PencilLine,
  Search,
} from "lucide-react";
import {
  SAFETY_IMAGE_CATEGORIES,
  SAFETY_IMAGE_LANGUAGE_LABELS,
  type SafetyImageArtworkOrientation,
  type SafetyImageCategory,
  type SafetyImageLanguage,
  type SafetyImageTheme,
  type SafetyImageUse,
} from "@/data/safety-image-library";

type SortMode = "recommended" | "order" | "new";
type QuickFilter =
  | "all"
  | "recommended"
  | "ppe"
  | "prohibition"
  | "heavy"
  | "multilingual"
  | "numeric";

const USES: readonly SafetyImageUse[] = ["掲示", "報告書", "施工計画", "教育", "朝礼"];
const LANGUAGES = Object.entries(SAFETY_IMAGE_LANGUAGE_LABELS) as [SafetyImageLanguage, string][];

export function SafetyImageLibraryClient({
  themes,
  initialCategory = "all",
}: {
  themes: readonly SafetyImageTheme[];
  initialCategory?: SafetyImageCategory | "all";
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SafetyImageCategory | "all">(initialCategory);
  const [use, setUse] = useState<SafetyImageUse | "all">("all");
  const [signFormat, setSignFormat] = useState("all");
  const [language, setLanguage] = useState<SafetyImageLanguage | "all">("all");
  const [orientation, setOrientation] = useState<SafetyImageArtworkOrientation | "all">("all");
  const [numericOnly, setNumericOnly] = useState(false);
  const [documentOnly, setDocumentOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [visibleCount, setVisibleCount] = useState(20);

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
      if (language !== "all" && !theme.texts[language]) return false;
      if (orientation !== "all" && theme.orientation !== orientation) return false;
      if (numericOnly && !theme.editableNumber) return false;
      if (documentOnly && !theme.uses.some((item) => item === "施工計画" || item === "報告書")) return false;
      if (quickFilter === "recommended" && !theme.recommended) return false;
      if (quickFilter === "ppe" && theme.category !== "protective-equipment") return false;
      if (quickFilter === "prohibition" && theme.category !== "entry-prohibition") return false;
      if (quickFilter === "heavy" && !(theme.category === "hazard-warning" && /重機|吊り|荷/u.test(searchable))) return false;
      if (quickFilter === "multilingual" && theme.multilingualPriority !== "high") return false;
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
  }, [category, documentOnly, language, numericOnly, orientation, query, quickFilter, signFormat, sort, themes, use]);

  const visible = filtered.slice(0, visibleCount);
  const updateFilter = (callback: () => void) => {
    callback();
    setVisibleCount(20);
  };

  return (
    <section aria-labelledby="library-results-heading">
      <div data-safety-sign-filters className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(18rem,1.4fr)_repeat(3,minmax(8rem,.7fr))]">
          <label className="relative block">
            <span className="sr-only">安全画像をキーワード検索</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
              placeholder="例：ヘルメット、足場、熱中症"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-base font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <FilterSelect
            label="カテゴリ"
            value={category}
            onChange={(value) => updateFilter(() => setCategory(value as SafetyImageCategory | "all"))}
            options={SAFETY_IMAGE_CATEGORIES.map((item) => ({ value: item.id, label: item.shortLabel }))}
          />
          <FilterSelect
            label="看板形式"
            value={signFormat}
            onChange={(value) => updateFilter(() => setSignFormat(value))}
            options={[...new Set(themes.map((theme) => theme.signFormat))].sort().map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="言語"
            value={language}
            onChange={(value) => updateFilter(() => setLanguage(value as SafetyImageLanguage | "all"))}
            options={LANGUAGES.map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="向き"
            value={orientation}
            onChange={(value) => updateFilter(() => setOrientation(value as SafetyImageArtworkOrientation | "all"))}
            options={[
              { value: "portrait", label: "縦" },
              { value: "landscape", label: "横" },
              { value: "square", label: "正方形" },
            ]}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <FilterSelect
            label="用途"
            value={use}
            onChange={(value) => updateFilter(() => setUse(value as SafetyImageUse | "all"))}
            options={USES.map((item) => ({ value: item, label: item }))}
          />
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input type="checkbox" checked={numericOnly} onChange={(event) => updateFilter(() => setNumericOnly(event.target.checked))} className="h-5 w-5 accent-emerald-800" />数値を編集できる
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input type="checkbox" checked={documentOnly} onChange={(event) => updateFilter(() => setDocumentOnly(event.target.checked))} className="h-5 w-5 accent-emerald-800" />施工計画・報告書向け
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="よく使う絞り込み">
          {[
            ["recommended", "よく使う看板"],
            ["ppe", "保護具"],
            ["prohibition", "立入・禁止"],
            ["heavy", "重機・吊り荷"],
            ["multilingual", "多言語"],
            ["numeric", "荷重・数値編集"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={quickFilter === value}
              onClick={() => updateFilter(() => setQuickFilter((current) => current === value ? "all" : value as QuickFilter))}
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
      </div>
      <noscript>
        <style>{`[data-safety-sign-filters]{display:none!important}`}</style>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-slate-900">
          <p className="font-bold">JavaScript無効時は、次の通常リンクから公開中の100点を選べます。</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {themes.map((theme) => (
              <li key={theme.slug}>
                <Link className="font-bold underline underline-offset-4" href={theme.detailPath}>
                  {theme.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </noscript>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">検索結果 {filtered.length}点</p>
          <h2 id="library-results-heading" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            看板から選ぶ
          </h2>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          並び順
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-bold dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="recommended">おすすめ順</option>
            <option value="order">登録順</option>
            <option value="new">新着順</option>
          </select>
        </label>
      </div>

      {visible.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((theme, index) => (
            <article key={theme.slug} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950">
              <Link href={theme.detailPath} className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-300">
                <div className={`relative overflow-hidden bg-slate-100 ${theme.orientation === "portrait" ? "aspect-[4/5]" : theme.orientation === "square" ? "aspect-square" : "aspect-[3/2]"}`}>
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
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />おすすめ
                    </span>
                  ) : null}
                </div>
                <div className="p-4 pb-2">
                  <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">{theme.categoryLabel}</p>
                  <h3 className="mt-1 text-lg font-black leading-7 text-slate-950 dark:text-white">{theme.title}</h3>
                  <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{theme.signFormat}・{theme.recommendedSize}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"><Languages className="h-4 w-4" aria-hidden="true" />5言語{theme.editableNumber ? "・数値編集" : "・文字編集"}</p>
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-2 p-4 pt-3">
                <Link href={theme.detailPath} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-emerald-800 px-2 text-sm font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
                  <Download className="h-4 w-4" aria-hidden="true" />そのまま使う
                </Link>
                <Link href={`${theme.detailPath}#edit`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-emerald-700 px-2 text-sm font-black text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:text-emerald-200">
                  <PencilLine className="h-4 w-4" aria-hidden="true" />文字を編集
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="font-black text-slate-800 dark:text-slate-100">条件に合う画像がありません。</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setUse("all");
              setSignFormat("all");
              setLanguage("all");
              setOrientation("all");
              setNumericOnly(false);
              setDocumentOnly(false);
              setQuickFilter("all");
              setVisibleCount(20);
            }}
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
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />{label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <option value="all">すべて</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
