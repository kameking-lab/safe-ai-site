"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Database, Loader2, Search } from "lucide-react";
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
};

const DATA_SOURCE_URL = "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DB.aspx";

function uniqueSortedKeys(map: YearMap): string[] {
  const set = new Set<string>();
  for (const year of Object.keys(map)) {
    for (const k of Object.keys(map[year])) {
      if (k && k !== "#REF!" && k !== "分類不能") set.add(k);
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

export function MhlwAccidentSearchPanel() {
  const industries = useMemo(() => uniqueSortedKeys(byIndustry as YearMap), []);
  const types = useMemo(() => uniqueSortedKeys(byYear as YearMap), []);
  const defaultYear = meta.accidents.years[meta.accidents.years.length - 1];

  const [year, setYear] = useState<number | "">(defaultYear ?? "");
  const [industry, setIndustry] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; data: SearchResponse }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const handleSearch = async () => {
    setState({ kind: "loading" });
    const qs = new URLSearchParams();
    if (year) qs.set("year", String(year));
    if (industry) qs.set("industry", industry);
    if (type) qs.set("type", type);
    if (keyword.trim()) qs.set("q", keyword.trim());
    qs.set("limit", "50");
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
  };

  const isLoading = state.kind === "loading";
  const showFallbackNote =
    state.kind === "ready" && (state.data.fallback || state.data.source !== "blob");
  const noMatches =
    state.kind === "ready" && !state.data.fallback && state.data.records.length === 0;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              MHLW 50万件検索 — 厚労省 労働災害データベース
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

      {state.kind === "ready" && !showFallbackNote && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>
              <span className="font-semibold text-slate-700">
                {state.data.total.toLocaleString()}
              </span>
              件ヒット（{state.data.year} 年シャード / 上位{state.data.records.length}件表示）
            </p>
          </div>
          {noMatches && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              該当する災害事例が見つかりませんでした。条件を緩めて再検索してください。
            </div>
          )}
          <ul className="space-y-2">
            {state.data.records.map((rec) => (
              <li
                key={rec.id ?? `${rec.year}-${rec.month}-${rec.description?.slice(0, 20)}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <SeverityBadge accident={rec} />
                  <span>{rec.year}年{rec.month}月</span>
                  {rec.industry?.majorName && <span>業種: {rec.industry.majorName}</span>}
                  {rec.age !== null && rec.age !== undefined && <span>{rec.age}歳</span>}
                  {rec.workplaceSize && <span>規模: {rec.workplaceSize}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                  {rec.description ?? "（概要なし）"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
