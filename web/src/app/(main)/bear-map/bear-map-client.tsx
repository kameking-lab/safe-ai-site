"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  BEAR_SIGHTINGS_REAL,
  PREFECTURES,
  SIGHTING_TYPES,
  type BearSightingType,
  type Prefecture,
} from "@/data/bear-sightings-real";
import { PREFECTURE_VIEW } from "./bear-leaflet-map";

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
const LAST_UPDATED = "2026年4月7日";

// 種別バッジカラー
const TYPE_BADGE: Record<BearSightingType, string> = {
  目撃: "bg-green-500",
  被害: "bg-red-500",
  捕獲: "bg-blue-500",
  痕跡: "bg-gray-400",
};

export function BearMapClient() {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterPrefecture, setFilterPrefecture] = useState<Prefecture | null>(null);
  const [filterType, setFilterType] = useState<BearSightingType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [targetView, setTargetView] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(null);

  // debounce検索（300ms）
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 都道府県選択時にズーム
  const handlePrefectureChange = useCallback((pref: Prefecture | null) => {
    setFilterPrefecture(pref);
    if (pref && PREFECTURE_VIEW[pref]) {
      setTargetView(PREFECTURE_VIEW[pref]);
    } else {
      setTargetView({ center: [37.5, 137.8], zoom: 7 });
    }
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return BEAR_SIGHTINGS_REAL.filter((s) => {
      if (filterYear !== null) {
        const year = new Date(s.date).getFullYear();
        if (year !== filterYear) return false;
      }
      if (filterMonth !== null) {
        const month = new Date(s.date).getMonth() + 1;
        if (month !== filterMonth) return false;
      }
      if (filterPrefecture !== null && s.prefecture !== filterPrefecture) return false;
      if (filterType !== null && s.type !== filterType) return false;
      if (q) {
        const hay = (s.city + s.prefecture + s.location).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filterYear, filterMonth, filterPrefecture, filterType, debouncedQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">クマ出没マップ</h1>
        <p className="mt-1 text-sm text-slate-600">
          2024〜2025年の主要クマ出没情報。現場作業前に確認してください。
        </p>
      </div>

      {/* 警告バナー */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <span className="mt-0.5 shrink-0 text-2xl">🐻</span>
        <div>
          <p className="text-sm font-bold text-amber-900">現場作業前にクマ出没情報を確認しましょう</p>
          <p className="mt-0.5 text-xs text-amber-800">
            山林・農地・林道付近での作業前に最新情報を確認し、クマ鈴・ラジオ・スプレーを携行してください。
          </p>
        </div>
      </div>

      {/* 最終更新バナー */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700">
        📅 データ最終更新: <strong>{LAST_UPDATED}</strong> ｜
        出典: 各自治体公表資料（富山県・秋田県・石川県・長野県・新潟県）
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-slate-600">凡例：</span>
        {SIGHTING_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-full ${TYPE_BADGE[t]}`} />
            {t}
          </span>
        ))}
      </div>

      {/* テキスト検索 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="市区町村名で検索（例: 富山市、白山市）"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            クリア
          </button>
        )}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 都道府県フィルター（ズーム連動） */}
        <select
          value={filterPrefecture ?? ""}
          onChange={(e) =>
            handlePrefectureChange((e.target.value as Prefecture) || null)
          }
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-amber-400 focus:outline-none"
        >
          <option value="">すべての都道府県</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* 種別フィルター */}
        <select
          value={filterType ?? ""}
          onChange={(e) => setFilterType((e.target.value as BearSightingType) || null)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-amber-400 focus:outline-none"
        >
          <option value="">すべての種別</option>
          {SIGHTING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* 年フィルター */}
        <span className="text-xs font-semibold text-slate-600">年：</span>
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

        {/* 月フィルター */}
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
          {filtered.length}件 / 全{BEAR_SIGHTINGS_REAL.length}件
        </span>
      </div>

      {/* 地図 */}
      <div className="h-[480px] overflow-hidden rounded-xl border border-slate-200 shadow-sm lg:h-[580px]">
        <BearLeafletMap sightings={filtered} targetView={targetView} />
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">
          出没情報一覧（{filtered.length}件）
        </h2>
        <div className="space-y-2">
          {filtered.slice(0, 100).map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${TYPE_BADGE[s.type]}`}
                >
                  {s.type}
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {s.prefecture} {s.city}
                </span>
                <span className="text-xs text-slate-500">{s.location}</span>
                <span className="ml-auto text-xs text-slate-400">{s.date}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{s.description}</p>
            </div>
          ))}
          {filtered.length > 100 && (
            <p className="text-center text-xs text-slate-400">
              先頭100件を表示中。フィルターを使って絞り込んでください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
