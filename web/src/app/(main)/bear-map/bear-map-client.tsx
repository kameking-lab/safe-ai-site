"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { bearSightings } from "@/data/bear-sightings";

const BearLeafletMap = dynamic(() => import("./bear-leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
      地図を読み込んでいます…
    </div>
  ),
});

const YEARS = [2024, 2025];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function BearMapClient() {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return bearSightings.filter((s) => {
      if (filterYear !== null && s.year !== filterYear) return false;
      if (filterMonth !== null && s.month !== filterMonth) return false;
      return true;
    });
  }, [filterYear, filterMonth]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">クマ出没マップ</h1>
        <p className="mt-1 text-sm text-slate-600">
          2024〜2025年の主要クマ目撃情報。現場作業前に確認してください。
        </p>
      </div>

      {/* 警告バナー */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <span className="mt-0.5 shrink-0 text-2xl">🐻</span>
        <div>
          <p className="text-sm font-bold text-amber-900">現場作業前にクマ出没情報を確認しましょう</p>
          <p className="mt-0.5 text-xs text-amber-800">
            山林・農地・林道付近での作業前に最新情報を確認し、クマ鈴・ラジオ・スプレーを携行してください。
            出没情報のある区域では複数人での作業を基本としてください。
          </p>
        </div>
      </div>

      {/* データソースバナー */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700">
        📌 現在表示しているデータはモックデータです。実際の出没情報は各都道府県・市区町村の公式サイトをご確認ください。
        <strong className="ml-1">データソース接続予定（環境省・各都道府県）</strong>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-600">年別：</span>
        <button
          onClick={() => setFilterYear(null)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            filterYear === null
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-amber-400"
          }`}
        >
          すべて
        </button>
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setFilterYear(filterYear === y ? null : y)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filterYear === y
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-amber-400"
            }`}
          >
            {y}年
          </button>
        ))}

        <span className="ml-2 text-xs font-semibold text-slate-600">月別：</span>
        <select
          value={filterMonth ?? ""}
          onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-amber-400 focus:outline-none"
        >
          <option value="">すべての月</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-slate-500">
          {filtered.length}件 / 全{bearSightings.length}件
        </span>
      </div>

      {/* 地図 */}
      <div className="h-[480px] overflow-hidden rounded-xl border border-slate-200 shadow-sm lg:h-[580px]">
        <BearLeafletMap sightings={filtered} />
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">目撃情報一覧</h2>
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                    s.bearType === "ヒグマ" ? "bg-red-600" : "bg-amber-600"
                  }`}
                >
                  {s.bearType}
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {s.prefecture} {s.city}
                </span>
                <span className="text-xs text-slate-500">{s.date}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
