"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { MhlwNotice, MhlwNoticeDocType } from "@/data/mhlw-notices";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CopyCitationButton } from "@/components/favorites/copy-citation-button";
import { formatNoticeCitation } from "@/lib/favorites";

// P1-I: /circulars にキーワード+期間+種別フィルタを追加。
// 1069件全件をクライアントに渡し、フィルタ後の上位 200 件を表示する。
// 1000+件の表示はスクロール負荷が大きいので、ヒット数表示＋上位 N 件で運用。

const DOC_TYPES: { value: MhlwNoticeDocType | "all"; label: string; icon: string }[] = [
  { value: "all", label: "すべて", icon: "🔍" },
  { value: "通達", label: "通達", icon: "📄" },
  { value: "告示", label: "告示", icon: "🏛" },
  { value: "指針", label: "指針", icon: "📘" },
];

const MAX_RENDER = 200;

export function CircularsFilterableList({ all }: { all: MhlwNotice[] }) {
  const [q, setQ] = useState("");
  const [docType, setDocType] = useState<MhlwNoticeDocType | "all">("all");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
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

  const shown = filtered.slice(0, MAX_RENDER);
  const truncated = filtered.length > MAX_RENDER;

  const reset = () => {
    setQ("");
    setDocType("all");
    setYearFrom("");
    setYearTo("");
  };

  const hasFilter = !!q || docType !== "all" || !!yearFrom || !!yearTo;

  return (
    <div className="space-y-4">
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
                className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  docType === t.value
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <span aria-hidden="true">{t.icon}</span> {t.label}
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
                className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                条件をクリア
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-600">
            該当 <span className="font-bold text-emerald-700">{filtered.length.toLocaleString()}</span>件
            （全{all.length.toLocaleString()}件中）
            {truncated && (
              <span className="ml-1 text-amber-700">
                表示は上位 {MAX_RENDER} 件まで。さらに絞り込むには条件を追加してください。
              </span>
            )}
          </p>
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
    </div>
  );
}
