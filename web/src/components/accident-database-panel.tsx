"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALL_ACCIDENT_CATEGORIES,
  ALL_ACCIDENT_TYPES,
  type AccidentCase,
  type AccidentType,
  type AccidentWorkCategory,
} from "@/lib/types/domain";
import { rankAccidents } from "@/lib/accidents/search-ranking";
import {
  ACCIDENT_PROVENANCE_INFO,
  resolveAccidentProvenance,
  resolveAccidentSource,
} from "@/lib/accident-source";
import { EasyJapaneseText } from "@/components/easy-japanese-text";
import { EmptyState } from "@/components/empty-state";
import { AccidentActionBar } from "@/components/accidents/action-bar";
import { AccidentTypePictogram } from "@/components/accidents/accident-type-pictogram";
import { StatusBadge } from "@/components/ui/status-badge";
import { SEVERITY_VISUAL } from "@/lib/accidents/accident-visual";
import { compactAccidentSummary } from "@/lib/accidents/compact-summary";
import {
  ACCIDENT_TRANSIENT_SEARCH_EVENT,
  getTransientAccidentKeyword,
  readTransientAccidentKeyword,
} from "@/lib/accidents/transient-search";
import { Mascot } from "@/components/mascot";

const PAGE_SIZE = 40;

type IndustryKey =
  | "construction"
  | "manufacturing"
  | "healthcare"
  | "transport"
  | "forestry"
  | "food"
  | "retail"
  | "cleaning"
  | "chemical"
  | "electrical";

const INDUSTRY_OPTIONS: { key: IndustryKey; label: string }[] = [
  { key: "construction", label: "建設" },
  { key: "manufacturing", label: "製造" },
  { key: "healthcare", label: "医療福祉" },
  { key: "transport", label: "運輸" },
  { key: "forestry", label: "林業" },
  { key: "food", label: "食品" },
  { key: "retail", label: "小売" },
  { key: "cleaning", label: "清掃" },
  { key: "chemical", label: "化学" },
  { key: "electrical", label: "電気" },
];

const INDUSTRY_CATEGORIES: Record<IndustryKey, AccidentWorkCategory[]> = {
  construction: ["建設業"],
  manufacturing: ["製造業"],
  healthcare: ["保健衛生業"],
  transport: ["運輸交通業"],
  forestry: ["林業"],
  food: ["製造業"],
  retail: ["商業"],
  cleaning: ["その他の事業"],
  chemical: ["化学"],
  electrical: ["電気業"],
};

function matchesAnyIndustry(workCategory: AccidentWorkCategory, industries: Set<IndustryKey>): boolean {
  if (industries.size === 0) return true;
  return Array.from(industries).some((key) => INDUSTRY_CATEGORIES[key].includes(workCategory));
}

function parseIndustriesParam(raw: string | null): Set<IndustryKey> {
  if (!raw) return new Set();
  const valid = new Set(INDUSTRY_OPTIONS.map((o) => o.key));
  const result = new Set<IndustryKey>();
  for (const part of raw.split(",")) {
    if (valid.has(part as IndustryKey)) result.add(part as IndustryKey);
  }
  return result;
}

const WORKER_ATTRIBUTE_OPTIONS = ["すべて", "女性労働者", "高齢者", "外国人", "非正規", "若年", "一般"] as const;
type WorkerAttributeFilter = (typeof WORKER_ATTRIBUTE_OPTIONS)[number];

const COMPANY_SIZE_OPTIONS = ["全規模", "大企業", "中小企業", "個人事業主"] as const;
type CompanySizeFilter = (typeof COMPANY_SIZE_OPTIONS)[number];

type AccidentDatabasePanelProps = {
  cases: AccidentCase[];
  allCases: AccidentCase[];
  selectedType: AccidentType | "すべて";
  selectedCategory: AccidentWorkCategory | "すべて";
  onSelectType: (type: AccidentType | "すべて") => void;
  onSelectCategory: (category: AccidentWorkCategory | "すべて") => void;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string | null;
};

function filterOptions(cases: AccidentCase[]) {
  const set = new Set<AccidentType>();
  for (const item of cases) {
    set.add(item.type);
  }
  const ordered = ALL_ACCIDENT_TYPES.filter((type) => set.has(type));
  return ["すべて", ...ordered] as const;
}

export function AccidentDatabasePanel({
  cases,
  allCases,
  selectedType,
  selectedCategory,
  onSelectType,
  onSelectCategory,
  status,
  errorMessage,
}: AccidentDatabasePanelProps) {
  const router = useRouter();
  const options = filterOptions(allCases);
  const categoryOptions = ["すべて", ...ALL_ACCIDENT_CATEGORIES] as const;
  const [page, setPage] = useState(0);
  const [selectedIndustries, setSelectedIndustriesState] = useState<Set<IndustryKey>>(new Set());
  const [keyword, setKeyword] = useState(getTransientAccidentKeyword);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const previousKeywordRef = useRef(keyword);
  const [selectedWorkerAttribute, setSelectedWorkerAttribute] = useState<WorkerAttributeFilter>("すべて");
  const [selectedCompanySize, setSelectedCompanySize] = useState<CompanySizeFilter>("全規模");

  useEffect(() => {
    const input = keywordInputRef.current;
    if (!input) return;
    const domValue = input.value;
    const previousValue = previousKeywordRef.current;
    previousKeywordRef.current = keyword;
    if (domValue !== previousValue && keyword === previousValue) {
      const timer = window.setTimeout(() => {
        setKeyword(domValue);
        setPage(0);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (domValue !== keyword) input.value = keyword;
  }, [keyword]);

  // クライアントマウント後にURLパラメータを読み込む（SSR互換）
  // 旧共有URLは読み取りだけ維持する。新しい任意入力はメモリ内に限定する。
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const initial = parseIndustriesParam(sp.get("acc_industries"));
    /* eslint-disable react-hooks/set-state-in-effect */
    if (initial.size > 0) setSelectedIndustriesState(initial);
    // Global search and older links use `q`; the database-native key is `acc_kw`.
    const kw = sp.get("acc_kw") ?? sp.get("q");
    if (kw) setKeyword(kw);
    const attr = sp.get("acc_attr");
    if (attr && (WORKER_ATTRIBUTE_OPTIONS as readonly string[]).includes(attr)) {
      setSelectedWorkerAttribute(attr as WorkerAttributeFilter);
    }
    const size = sp.get("acc_size");
    if (size && (COMPANY_SIZE_OPTIONS as readonly string[]).includes(size)) {
      setSelectedCompanySize(size as CompanySizeFilter);
    }
    const pageParam = Number.parseInt(sp.get("acc_page") ?? "", 10);
    if (Number.isFinite(pageParam) && pageParam > 0) {
      setPage(pageParam - 1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const applyTransientKeyword = (event: Event) => {
      const nextKeyword = readTransientAccidentKeyword(event);
      if (nextKeyword === null) return;
      setKeyword(nextKeyword);
      setPage(0);
    };
    window.addEventListener(
      ACCIDENT_TRANSIENT_SEARCH_EVENT,
      applyTransientKeyword,
    );
    const pendingKeyword = getTransientAccidentKeyword();
    const pendingTimer = pendingKeyword
      ? window.setTimeout(() => {
          setKeyword(pendingKeyword);
          setPage(0);
        }, 0)
      : null;
    return () => {
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
      window.removeEventListener(
        ACCIDENT_TRANSIENT_SEARCH_EVENT,
        applyTransientKeyword,
      );
    };
  }, []);

  // 固定選択肢とページだけをURLに同期（初回はスキップ）。
  const filterHydrated = useRef(false);
  useEffect(() => {
    if (!filterHydrated.current) {
      filterHydrated.current = true;
      return;
    }
    const sp = new URLSearchParams(window.location.search);
    if (selectedWorkerAttribute !== "すべて") sp.set("acc_attr", selectedWorkerAttribute); else sp.delete("acc_attr");
    if (selectedCompanySize !== "全規模") sp.set("acc_size", selectedCompanySize); else sp.delete("acc_size");
    if (page > 0) sp.set("acc_page", String(page + 1)); else sp.delete("acc_page");
    router.replace(`?${sp.toString()}`, { scroll: false });
  }, [selectedWorkerAttribute, selectedCompanySize, page, router]);

  useEffect(() => {
    const restoreFromHistory = () => {
      const sp = new URLSearchParams(window.location.search);
      const restoredPage = Number.parseInt(sp.get("acc_page") ?? "", 10);
      setPage(
        Number.isFinite(restoredPage) && restoredPage > 0
          ? restoredPage - 1
          : 0,
      );
    };
    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, []);

  const updateIndustriesUrl = useCallback(
    (industries: Set<IndustryKey>) => {
      const sp = new URLSearchParams(window.location.search);
      const val = Array.from(industries).join(",");
      if (val) sp.set("acc_industries", val); else sp.delete("acc_industries");
      router.replace(`?${sp.toString()}`, { scroll: false });
    },
    [router]
  );

  const toggleIndustry = useCallback(
    (key: IndustryKey) => {
      setSelectedIndustriesState((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        updateIndustriesUrl(next);
        setPage(0);
        return next;
      });
    },
    [updateIndustriesUrl, setPage]
  );

  const resetIndustries = useCallback(() => {
    const empty = new Set<IndustryKey>();
    setSelectedIndustriesState(empty);
    updateIndustriesUrl(empty);
    setPage(0);
  }, [updateIndustriesUrl, setPage]);

  const filteredByIndustry = useMemo(() => {
    const filtered = cases.filter((c) => {
      if (!matchesAnyIndustry(c.workCategory, selectedIndustries)) return false;
      if (selectedWorkerAttribute !== "すべて") {
        const attrs = c.worker_attribute;
        if (!attrs || !attrs.includes(selectedWorkerAttribute)) return false;
      }
      if (selectedCompanySize !== "全規模") {
        const size = c.company_size;
        if (!size || (size !== "全規模" && size !== selectedCompanySize)) return false;
      }
      return true;
    });
    return rankAccidents(filtered, keyword);
  }, [cases, selectedIndustries, selectedWorkerAttribute, selectedCompanySize, keyword]);

  const totalCasesForDisplay = filteredByIndustry.length;
  const totalPages = Math.max(1, Math.ceil(totalCasesForDisplay / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredByIndustry.slice(start, start + PAGE_SIZE);
  }, [filteredByIndustry, currentPage]);

  const publishedCaseCount = allCases.filter((accident) => {
    const provenance = resolveAccidentProvenance(accident);
    return provenance === "mhlw" || provenance === "curated";
  }).length;
  const learningCaseCount = allCases.filter(
    (accident) => resolveAccidentProvenance(accident) === "synthetic",
  ).length;

  return (
    <section id="accident-results" className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">事故データベース</h2>
          <p className="mt-1 text-xs text-slate-600">
            公式個票URLを持つ公表事例・公開情報からの編集再構成 {publishedCaseCount.toLocaleString("ja-JP")}件
            {learningCaseCount > 0 &&
              `、実事故ではない教材用の想定例 ${learningCaseCount.toLocaleString("ja-JP")}件`}
            を出典区分付きで収録。業種・種別・作業カテゴリで絞り込めます。
          </p>
        </div>
        <Mascot variant="detective" size="md" alt="" className="hidden shrink-0 sm:block" />
      </div>

      <details className="mt-3 rounded-xl border border-slate-200 px-3 print:hidden">
        <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-slate-800">
          業種・条件を絞る
        </summary>
        <div className="space-y-3 border-t border-slate-200 py-3">
        <div>
          <label htmlFor="accident-keyword" className="block text-xs font-semibold text-slate-700">
            キーワード検索
          </label>
          <input
            ref={keywordInputRef}
            id="accident-keyword"
            type="text"
            defaultValue={keyword}
            suppressHydrationWarning
            onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            placeholder="タイトル・概要・種別で検索（表記ゆれ対応）"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              業種フィルタ（複数選択可）
              {selectedIndustries.size > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {selectedIndustries.size}業種選択中 / {filteredByIndustry.length}件
                </span>
              )}
            </p>
            {selectedIndustries.size > 0 && (
              <button
                type="button"
                onClick={resetIndustries}
                className="inline-flex min-h-[44px] items-center px-2 text-[11px] font-semibold text-slate-500 hover:text-red-500 transition"
              >
                フィルタをリセット
              </button>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {INDUSTRY_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleIndustry(key)}
                className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedIndustries.has(key) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* 属性・規模フィルタ */}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">対象属性</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {WORKER_ATTRIBUTE_OPTIONS.map((attr) => (
                <button
                  key={attr}
                  type="button"
                  onClick={() => {
                    setSelectedWorkerAttribute(attr);
                    setPage(0);
                  }}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    attr === selectedWorkerAttribute ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {attr}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">事業所規模</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {COMPANY_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setSelectedCompanySize(size);
                    setPage(0);
                  }}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    size === selectedCompanySize ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">作業カテゴリ</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryOptions.map((option) => {
              const isActive = option === selectedCategory;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onSelectCategory(option);
                    setPage(0);
                  }}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label htmlFor="accident-type-filter" className="block text-xs font-semibold text-slate-700">
            事故種別
          </label>
          <select
            id="accident-type-filter"
            value={selectedType}
            onChange={(event) => {
              onSelectType(event.target.value as AccidentType | "すべて");
              setPage(0);
            }}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        </div>
      </details>

      <p className="mt-2 text-xs text-slate-500">
        {totalCasesForDisplay === 0
          ? "0件"
          : `表示: ${totalCasesForDisplay.toLocaleString("ja-JP")}件中 ${currentPage * PAGE_SIZE + 1}〜${Math.min((currentPage + 1) * PAGE_SIZE, totalCasesForDisplay)}件`}
      </p>

      <div className="mt-3 space-y-3" aria-live="polite" aria-atomic="false">
        {status === "loading" ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            事故データを読み込み中です...
          </p>
        ) : status === "error" ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage ?? "事故データを取得できませんでした。"}
          </p>
        ) : totalCasesForDisplay === 0 ? (
          <EmptyState
            title="条件に一致する事故データがありません"
            description="業種・事故の型・キーワードの絞り込みを見直してください。"
          />
        ) : (
          pageItems.map((searchResult) => {
            const accident = searchResult.accident;
            const source = resolveAccidentSource(accident);
            const provenance = resolveAccidentProvenance(accident);
            const provenanceInfo = ACCIDENT_PROVENANCE_INFO[provenance];
            const compactSummary = compactAccidentSummary(accident.summary);
            return (
              <article
                key={accident.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                aria-label={`事故データ ${accident.title}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* 柱0: 型ピクトグラム＋重篤度の色文法（死亡=赤solid/重傷=赤/中等傷=黄/軽傷=グレー） */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 py-0.5 pl-1 pr-2 text-[11px] font-semibold text-rose-800">
                    <AccidentTypePictogram type={accident.type} size="sm" />
                    {accident.type}
                  </span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                    {accident.workCategory}
                  </span>
                  <StatusBadge
                    tone={SEVERITY_VISUAL[accident.severity].tone}
                    variant={SEVERITY_VISUAL[accident.severity].variant}
                    size="sm"
                  >
                    {accident.severity}
                  </StatusBadge>
                  <span
                    className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                    title={provenanceInfo.description}
                  >
                    {provenanceInfo.label}
                  </span>
                  <span className="text-xs text-slate-500">{accident.occurredOn}</span>
                </div>

                <h3 className="mt-2 text-sm font-semibold text-slate-900">{accident.title}</h3>
                {searchResult.matchFields.length > 0 && (
                  <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-950">
                    <p className="font-bold">一致フィールド: {searchResult.matchFields.join("・")}</p>
                    <ul className="mt-1 space-y-0.5">
                      {searchResult.matchSnippets.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
                <p className="mt-1 line-clamp-2 text-sm text-slate-700"><EasyJapaneseText>{compactSummary}</EasyJapaneseText></p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {provenance === "mhlw" ? (
                    <Link
                      href={`/accidents/${accident.id}`}
                      className="inline-flex min-h-[44px] items-center text-xs font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
                    >
                      詳細・関連事故
                    </Link>
                  ) : null}
                  {source?.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center text-xs font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2"
                    >
                      出典: {source.site}
                      {source.caseId ? `（No.${source.caseId}）` : ""} ↗
                    </a>
                  ) : source ? (
                    <span className="text-xs font-semibold text-slate-500">
                      出典: {source.site}
                      {source.caseId ? `（No.${source.caseId}）` : ""}
                    </span>
                  ) : null}
                </div>

                <details className="group mt-2 rounded-lg border border-slate-200 bg-white">
                  <summary className="flex min-h-[44px] cursor-pointer items-center px-3 text-xs font-semibold text-slate-700">
                    原因・対策と関連操作
                  </summary>
                  <div className="space-y-3 border-t border-slate-200 p-3 text-xs text-slate-700">
                {compactSummary !== accident.summary ? (
                  <div>
                    <p className="font-semibold text-slate-900">概要</p>
                    <p className="mt-1 leading-5"><EasyJapaneseText>{accident.summary}</EasyJapaneseText></p>
                  </div>
                ) : null}
                <dl className="space-y-1">
                  <div>
                    <dt className="inline font-semibold text-slate-900">主な原因:</dt>
                    <dd className="inline"> {accident.mainCauses.join(" / ")}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-slate-900">再発防止の要点:</dt>
                    <dd className="inline"> {accident.preventionPoints.join(" / ")}</dd>
                  </div>
                </dl>

                <div className="space-y-2">
                    {"description" in accident && accident.description ? (
                      <div>
                        <p className="font-semibold text-slate-900">発生状況</p>
                        <p className="mt-1 leading-5"><EasyJapaneseText>{String(accident.description)}</EasyJapaneseText></p>
                      </div>
                    ) : null}
                    {"causes" in accident && accident.causes ? (
                      <div>
                        <p className="font-semibold text-slate-900">原因</p>
                        <p className="mt-1 leading-5">{String(accident.causes)}</p>
                      </div>
                    ) : null}
                    {"countermeasures" in accident && accident.countermeasures ? (
                      <div>
                        <p className="font-semibold text-slate-900">対策</p>
                        <p className="mt-1 leading-5">{String(accident.countermeasures)}</p>
                      </div>
                    ) : null}
                    {"recurrencePrevention" in accident && accident.recurrencePrevention ? (
                      <div>
                        <p className="font-semibold text-slate-900">再発防止策</p>
                        <p className="mt-1 leading-5">{String(accident.recurrencePrevention)}</p>
                      </div>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/e-learning"
                    className="inline-flex min-h-[44px] items-center text-xs font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2"
                  >
                    この事例で学習する
                  </Link>
                </div>

                <AccidentActionBar accident={accident} variant="inline" />
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={`/safety-diary/new?q=${encodeURIComponent(accident.title)}`}
                    className="inline-flex min-h-[44px] items-center text-xs font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2"
                  >
                    日誌に記録
                  </Link>
                </div>
                  </div>
                </details>
              </article>
            );
          })
        )}
      </div>

      {totalPages > 1 && status === "success" && cases.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            aria-label="前のページへ"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-xs text-slate-600">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            aria-label="次のページへ"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      ) : null}
    </section>
  );
}
