"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, FileText, Landmark, BookOpen, ListFilter, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MhlwNotice, MhlwNoticeDocType } from "@/data/mhlw-notices";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CopyCitationButton } from "@/components/favorites/copy-citation-button";
import { formatNoticeCitation } from "@/lib/favorites";
import { ConclusionCard } from "@/components/ui/conclusion-card";

// P1-I: /circulars にキーワード+期間+種別フィルタを追加。1069件全件をクライアントに渡す。
// 柱C-6/柱0: 初期表示は INITIAL_RENDER 件のみ（旧 200 件一括描画で約39,461px・スクロール負荷大）。
// 「さらに表示」で PAGE_STEP 件ずつ伸ばす＝ファーストビューを軽く、必要な人だけ深掘り。

const DOC_TYPES: { value: MhlwNoticeDocType | "all"; label: string; Icon: LucideIcon }[] = [
  { value: "all", label: "すべて", Icon: ListFilter },
  { value: "通達", label: "通達", Icon: FileText },
  { value: "告示", label: "告示", Icon: Landmark },
  { value: "指針", label: "指針", Icon: BookOpen },
];

const INITIAL_RENDER = 24;
const PAGE_STEP = 24;

export function CircularsFilterableList({ all }: { all: MhlwNotice[] }) {
  const [q, setQ] = useState("");
  const [docType, setDocType] = useState<MhlwNoticeDocType | "all">("all");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER);
  const deferredQ = useDeferredValue(q);

  const yearRange = useMemo(() => {
    const years = all
      .map((n) => (n.issuedDate ? Number.parseInt(n.issuedDate.slice(0, 4), 10) : NaN))
      .filter((y) => Number.isFinite(y));
    if (years.length === 0) return { min: 2000, max: new Date().getFullYear() };
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [all]);

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    const yFrom = yearFrom ? Number.parseInt(yearFrom, 10) : null;
    const yTo = yearTo ? Number.parseInt(yearTo, 10) : null;
    return all.filter((n) => {
      if (docType !== "all" && n.docType !== docType) return false;
      if (yFrom != null || yTo != null) {
        const year = n.issuedDate ? Number.parseInt(n.issuedDate.slice(0, 4), 10) : null;
        if (year == null) return false;
        if (yFrom != null && year < yFrom) return false;
        if (yTo != null && year > yTo) return false;
      }
      if (needle) {
        const hay = `${n.title} ${n.noticeNumber ?? ""} ${n.issuer ?? ""} ${n.category ?? ""} ${n.lawRef ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, deferredQ, docType, yearFrom, yearTo]);

  // 絞り込み条件が変わったら表示件数を初期値へ戻す（ファーストビューを軽く保つ）。
  // 描画中に前回条件と比較して調整する React 公式パターン（effect での setState を避ける）。
  const filterKey = `${deferredQ}|${docType}|${yearFrom}|${yearTo}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(INITIAL_RENDER);
  }

  const shown = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const hits = filtered.length;

  const reset = () => {
    setQ("");
    setDocType("all");
    setYearFrom("");
    setYearTo("");
  };

  const hasFilter = !!q || docType !== "all" || !!yearFrom || !!yearTo;

  return (
    <div className="space-y-4">
      {/* 結論カード: いまの状態=該当件数をデカ数字で（柱0ビジュアルファースト） */}
      {hits > 0 ? (
        <ConclusionCard
          tone="info"
          value={hits.toLocaleString("ja-JP")}
          unit="件"
          title="該当"
          description={`全${all.length.toLocaleString("ja-JP")}件から${hasFilter ? "絞り込み" : "全件表示"}中`}
        />
      ) : (
        <ConclusionCard
          tone="warning"
          title="該当なし"
          description="キーワード・期間・種別を緩めてお試しください。"
        />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="キーワードで検索（例: 石綿、化学物質、墜落、安衛則）"
              aria-label="通達・告示・指針のキーワード検索"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="検索キーワードをクリア"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setDocType(t.value)}
                aria-pressed={docType === t.value}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  docType === t.value
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <t.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-[11px] font-semibold text-slate-700">
              <span>発出年（From）</span>
              <input
                type="number"
                inputMode="numeric"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value.replace(/[^0-9]/g, ""))}
                min={yearRange.min}
                max={yearRange.max}
                placeholder={String(yearRange.min)}
                className="mt-1 w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-200"
              />
            </label>
            <span className="pb-2 text-xs text-slate-400">〜</span>
            <label className="flex flex-col text-[11px] font-semibold text-slate-700">
              <span>発出年（To）</span>
              <input
                type="number"
                inputMode="numeric"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value.replace(/[^0-9]/g, ""))}
                min={yearRange.min}
                max={yearRange.max}
                placeholder={String(yearRange.max)}
                className="mt-1 w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-200"
              />
            </label>
            {hasFilter && (
              <button
                type="button"
                onClick={reset}
                className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                条件をクリア
              </button>
            )}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {shown.length === 0 ? (
          <li className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            条件に合致する通達・告示・指針が見つかりませんでした。キーワード・期間・種別を緩めてお試しください。
          </li>
        ) : (
          shown.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                  {n.docType}
                </span>
                {n.noticeNumber ? <span>{n.noticeNumber}</span> : null}
                <span>{n.issuedDateRaw ?? n.issuedDate}</span>
                {n.issuer ? <span>{n.issuer}</span> : null}
                {/* P0-016 (usability-audit-day3): 通達の引用コピー + お気に入り */}
                <span className="ml-auto flex items-center gap-1.5">
                  <CopyCitationButton
                    text={formatNoticeCitation({
                      title: n.title,
                      issuer: n.issuer ?? undefined,
                      noticeNumber: n.noticeNumber ?? undefined,
                      issuedDate: n.issuedDateRaw ?? n.issuedDate ?? undefined,
                      url: `https://www.anzen-ai-portal.jp/circulars/${n.id}`,
                    })}
                  />
                  <FavoriteButton
                    kind="notice"
                    id={n.id}
                    title={n.title}
                    subtitle={`${n.docType}${n.noticeNumber ? ` ・ ${n.noticeNumber}` : ""}${n.issuer ? ` ・ ${n.issuer}` : ""}`}
                    href={`/circulars/${n.id}`}
                  />
                </span>
              </div>
              <Link
                href={`/circulars/${n.id}`}
                className="mt-1 block text-sm font-semibold text-slate-900 hover:text-emerald-700"
              >
                {n.title}
              </Link>
            </li>
          ))
        )}
      </ul>

      {hasMore && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_STEP)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-6 py-2.5 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            さらに表示（残り {(filtered.length - visibleCount).toLocaleString("ja-JP")}件）
          </button>
          <p className="text-[11px] text-slate-500">
            {shown.length.toLocaleString("ja-JP")} / {filtered.length.toLocaleString("ja-JP")}件 表示中
          </p>
        </div>
      )}
    </div>
  );
}
