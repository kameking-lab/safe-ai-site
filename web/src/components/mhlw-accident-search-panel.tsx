"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Database, Loader2, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Accident } from "@/types/mhlw";
import meta from "@/data/aggregates-mhlw/meta.json";
import byIndustry from "@/data/aggregates-mhlw/accidents-by-industry.json";
import byYear from "@/data/aggregates-mhlw/accidents-by-year.json";

type YearMap = Record<string, Record<string, number>>;

type SearchResponse = {
  ok: boolean;
  fallback: boolean;
  source: "blob" | "fallback" | "error";
  year: number | null;
  availableYears: number[];
  total: number;
  records: Accident[];
  message?: string;
  warning?: string;
};

const PAGE_SIZE = 50;
const DATA_SOURCE_URL = "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DB.aspx";

const EXCEL_ERROR_PATTERN = /^#(NAME\?|REF!|N\/A|VALUE!|DIV\/0!|NUM!|NULL!)/;

function uniqueSortedKeys(map: YearMap): string[] {
  const set = new Set<string>();
  for (const year of Object.keys(map)) {
    for (const k of Object.keys(map[year])) {
      if (k && !EXCEL_ERROR_PATTERN.test(k) && k !== "分類不能") set.add(k);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
}

function SeverityBadge({ accident }: { accident: Accident }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
      {accident.accidentType?.name ?? "種別不明"}
    </span>
  );
}

function DetailModal({ record, onClose }: { record: Accident; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const mhlwUrl = `https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DB.aspx`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">事故詳細</p>
            <h2 className="mt-0.5 text-sm font-bold text-slate-900">
              {record.year}年{record.month}月 — {record.accidentType?.name ?? "種別不明"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="space-y-4 p-4">
          {/* 業種 */}
          {(record.industry?.majorName || record.industry?.mediumName || record.industry?.minorName) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">業種</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {record.industry.majorName && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                    {record.industry.majorName}
                  </span>
                )}
                {record.industry.mediumName && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                    › {record.industry.mediumName}
                  </span>
                )}
                {record.industry.minorName && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    › {record.industry.minorName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 起因物 */}
          {(record.cause?.majorName || record.cause?.mediumName) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">起因物</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {record.cause.majorCode && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
                    コード: {record.cause.majorCode}
                  </span>
                )}
                {record.cause.majorName && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                    {record.cause.majorName}
                  </span>
                )}
                {record.cause.mediumName && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                    › {record.cause.mediumName}
                  </span>
                )}
                {record.cause.minorName && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    › {record.cause.minorName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 属性 */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            {record.age !== null && record.age !== undefined && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500">年齢</p>
                <p className="mt-0.5 font-semibold text-slate-800">{record.age}歳</p>
              </div>
            )}
            {record.occurrenceTime && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500">発生時間帯</p>
                <p className="mt-0.5 font-semibold text-slate-800">{record.occurrenceTime}時</p>
              </div>
            )}
            {record.workplaceSize && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500">事業場規模（人）</p>
                <p className="mt-0.5 font-semibold text-slate-800">{record.workplaceSize}</p>
              </div>
            )}
            {record.era && record.eraYear && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500">和暦</p>
                <p className="mt-0.5 font-semibold text-slate-800">{record.era}{record.eraYear}年</p>
              </div>
            )}
          </div>

          {/* 概要全文 */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">事故概要</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
              {record.description ?? "（概要なし）"}
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <a
              href="/ky"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              この事例でKY用紙を作成
            </a>
            <a
              href={mhlwUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              MHLW出典（厚労省）→
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccidentRecordCard({
  rec,
  onOpenDetail,
}: {
  rec: Accident;
  onOpenDetail: (rec: Accident) => void;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
        <SeverityBadge accident={rec} />
        <span>{rec.year}年{rec.month}月</span>
        {rec.industry?.majorName && <span>業種: {rec.industry.majorName}</span>}
        {rec.age !== null && rec.age !== undefined && <span>{rec.age}歳</span>}
        {rec.workplaceSize && <span>規模: {rec.workplaceSize}人</span>}
        {rec.occurrenceTime && <span>時間帯: {rec.occurrenceTime}時</span>}
      </div>
      <p className="mt-1.5 line-clamp-3 text-sm text-slate-800">
        {rec.description ?? "（概要なし）"}
      </p>
      <button
        type="button"
        onClick={() => onOpenDetail(rec)}
        className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
      >
        詳細を見る →
      </button>
    </li>
  );
}

export function MhlwAccidentSearchPanel() {
  const industries = useMemo(() => uniqueSortedKeys(byIndustry as YearMap), []);
  const types = useMemo(() => uniqueSortedKeys(byYear as YearMap), []);
  const defaultYear = meta.accidents.years[meta.accidents.years.length - 1];

  const [year, setYear] = useState<number | "">(defaultYear ?? "");
  const [industry, setIndustry] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("mhlw_page");
      return p ? Math.max(1, Number(p)) : 1;
    }
    return 1;
  });
  const [pageInput, setPageInput] = useState<string>("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; data: SearchResponse }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [detailRecord, setDetailRecord] = useState<Accident | null>(null);

  const totalPages = useMemo(() => {
    if (state.kind !== "ready" || state.data.fallback) return 1;
    return Math.max(1, Math.ceil(state.data.total / PAGE_SIZE));
  }, [state]);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      setState({ kind: "loading" });
      const qs = new URLSearchParams();
      if (year) qs.set("year", String(year));
      if (industry) qs.set("industry", industry);
      if (type) qs.set("type", type);
      if (keyword.trim()) qs.set("q", keyword.trim());
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String((targetPage - 1) * PAGE_SIZE));
      try {
        const res = await fetch(`/api/mhlw/search?${qs.toString()}`, {
          cache: "no-store",
        });
        const data: SearchResponse = await res.json();
        setState({ kind: "ready", data });
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "検索に失敗しました",
        });
      }
    },
    [year, industry, type, keyword]
  );

  const updatePageParam = (p: number) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("mhlw_page", String(p));
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const handleSearch = async () => {
    const newPage = 1;
    setPage(newPage);
    updatePageParam(newPage);
    await fetchPage(newPage);
  };

  const goToPage = async (targetPage: number) => {
    const clamped = Math.max(1, Math.min(targetPage, totalPages));
    setPage(clamped);
    updatePageParam(clamped);
    await fetchPage(clamped);
  };

  const isLoading = state.kind === "loading";
  const showFallbackNote =
    state.kind === "ready" && (state.data.fallback || state.data.source !== "blob");
  const noMatches =
    state.kind === "ready" && !state.data.fallback && state.data.records.length === 0;

  return (
    <div className="space-y-4">
      {detailRecord && (
        <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}

      {/* ヘッダー */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              MHLW 504,415件検索 — 厚労省 労働災害データベース
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              N={meta.accidents.total.toLocaleString()}件 / 2006〜2021年 の 16 年分から
              業種・事故種別・キーワードで絞り込みます。
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              出典:&nbsp;
              <a
                href={DATA_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-700"
              >
                厚生労働省 職場のあんぜんサイト 労働災害（死傷）月別DB
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            年
            <select
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">（最新年）</option>
              {meta.accidents.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            業種
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">すべて</option>
              {industries.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            事故種別
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">すべて</option>
              {types.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            キーワード（災害概要内）
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSearch(); }}
              placeholder="例: 墜落 / クレーン"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isLoading ? "検索中..." : "検索する"}
          </button>
        </div>
      </div>

      {/* 結果 */}
      {state.kind === "idle" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>年・業種・事故種別・キーワードを選んで「検索する」を押してください。</p>
          <p className="mt-1 text-xs text-slate-400">
            年を指定しない場合は最新年（{defaultYear}年）を対象に検索します。
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">検索に失敗しました</p>
            <p className="mt-0.5">{state.message}</p>
          </div>
        </div>
      )}

      {state.kind === "ready" && showFallbackNote && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">個別事例検索が一時的に利用できません</p>
            {state.data.message && (
              <p className="text-amber-700">{state.data.message}</p>
            )}
            <p>代わりに以下をご利用ください：</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-amber-900">
              <li>死亡災害 4,043件（「死亡災害」タブ）</li>
              <li>業種別ランキング（集計 504,415件ベース）</li>
              <li>サイト収録事例 268件</li>
            </ul>
          </div>
        </div>
      )}

      {state.kind === "ready" && !showFallbackNote && state.data.source === "blob" && (
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          MHLW 事故データ 全件検索稼働中 — {meta.accidents.total.toLocaleString()} 件から検索
        </div>
      )}

      {state.kind === "ready" && !showFallbackNote && (
        <div className="space-y-3">
          {state.data.warning && (
            <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              <span className="mt-0.5 shrink-0 font-bold">ℹ</span>
              <p>{state.data.warning}</p>
            </div>
          )}

          {/* ヒット数 + ページ情報 */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <p>
              <span className="font-semibold text-slate-700">
                {state.data.total.toLocaleString()}
              </span>
              件ヒット（{state.data.year} 年シャード）&nbsp;—&nbsp;
              {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, state.data.total)}件表示
            </p>
            <p className="text-slate-400">{page} / {totalPages} ページ</p>
          </div>

          {noMatches && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              該当する災害事例が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}

          <ul className="space-y-2">
            {state.data.records.map((rec) => (
              <AccidentRecordCard
                key={rec.id ?? `${rec.year}-${rec.month}-${rec.description?.slice(0, 20)}`}
                rec={rec}
                onOpenDetail={setDetailRecord}
              />
            ))}
          </ul>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => goToPage(1)}
                disabled={page === 1 || isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                title="最初のページ"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                前の{PAGE_SIZE}件
              </button>

              {/* 直接ページ入力 */}
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(pageInput);
                  if (n >= 1 && n <= totalPages) {
                    void goToPage(n);
                    setPageInput("");
                  }
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder={String(page)}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-xs text-slate-800"
                />
                <span className="text-xs text-slate-400">/ {totalPages}</span>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  移動
                </button>
              </form>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                次の{PAGE_SIZE}件
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => goToPage(totalPages)}
                disabled={page === totalPages || isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                title="最後のページ"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
