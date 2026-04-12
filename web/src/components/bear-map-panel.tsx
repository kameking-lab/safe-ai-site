"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef } from "react";
import {
  BEAR_SIGHTINGS_REAL,
  PREFECTURES,
  SIGHTING_TYPES,
  type BearSighting,
  type BearSightingType,
  type Prefecture,
} from "@/data/bear-sightings-real";

// Leafletはサーバーサイドで動かないためdynamic importで読み込み
const BearMapLeaflet = dynamic(() => import("@/components/bear-map-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
      地図を読み込み中...
    </div>
  ),
});

// 種別色（目撃=緑大、被害=赤大、捕獲=青、痕跡=灰）
const TYPE_COLORS: Record<BearSightingType, string> = {
  目撃: "bg-green-100 text-green-800 border-green-400",
  被害: "bg-red-100 text-red-800 border-red-300",
  捕獲: "bg-blue-100 text-blue-800 border-blue-300",
  痕跡: "bg-gray-100 text-gray-700 border-gray-300",
};

const TYPE_DOT: Record<BearSightingType, string> = {
  目撃: "bg-green-500",
  被害: "bg-red-500",
  捕獲: "bg-blue-500",
  痕跡: "bg-gray-400",
};

export function BearMapPanel() {
  const [selectedPrefectures, setSelectedPrefectures] = useState<Set<Prefecture>>(
    new Set(PREFECTURES)
  );
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<BearSightingType>>(
    new Set(SIGHTING_TYPES)
  );
  const [selectedSighting, setSelectedSighting] = useState<BearSighting | null>(null);
  const [citySearch, setCitySearch] = useState("");
  // 都道府県ズーム用：最後に単一選択した都道府県
  const [focusPrefecture, setFocusPrefecture] = useState<string | null>(null);
  const prevPrefecturesRef = useRef<Set<Prefecture>>(new Set(PREFECTURES));

  const togglePref = (pref: Prefecture) => {
    setSelectedPrefectures((prev) => {
      const next = new Set(prev);
      if (next.has(pref)) {
        next.delete(pref);
      } else {
        next.add(pref);
      }
      // 1県のみ選択 → ズーム。複数 or 0 → ズームしない
      if (next.size === 1) {
        setFocusPrefecture([...next][0]);
      } else {
        setFocusPrefecture(null);
      }
      prevPrefecturesRef.current = next;
      return next;
    });
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const toggleType = (type: BearSightingType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const cityQ = citySearch.trim().toLowerCase();
    return BEAR_SIGHTINGS_REAL.filter((s) => {
      if (!selectedPrefectures.has(s.prefecture as Prefecture)) return false;
      if (!selectedTypes.has(s.type)) return false;
      if (selectedMonths.size > 0) {
        const month = parseInt(s.date.split("-")[1], 10);
        if (!selectedMonths.has(month)) return false;
      }
      if (cityQ && !s.city.toLowerCase().includes(cityQ) && !s.location.toLowerCase().includes(cityQ)) {
        return false;
      }
      return true;
    });
  }, [selectedPrefectures, selectedMonths, selectedTypes, citySearch]);

  // 統計
  const stats = useMemo(() => {
    const byType: Record<BearSightingType, number> = { 目撃: 0, 被害: 0, 捕獲: 0, 痕跡: 0 };
    for (const s of filtered) byType[s.type]++;
    return byType;
  }, [filtered]);

  return (
    <div className="space-y-4 p-4 overflow-x-hidden">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">クママップ</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            各都道府県公開情報をもとにした出没データ（{BEAR_SIGHTINGS_REAL.length}件収録）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIGHTING_TYPES.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[t]}`} />
              {t}: {stats[t]}
            </span>
          ))}
        </div>
      </div>

      {/* フィルター */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        {/* 市区町村テキスト検索 */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">市区町村・地名検索</p>
          <input
            type="text"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="例: 富山市 / 南砺市 / 宇奈月..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          {citySearch && (
            <p className="mt-1 text-xs text-slate-400">
              「{citySearch}」で絞り込み中（{filtered.length}件）
              <button
                type="button"
                onClick={() => setCitySearch("")}
                className="ml-2 text-slate-500 underline hover:text-slate-700"
              >
                クリア
              </button>
            </p>
          )}
        </div>

        {/* 都道府県フィルター（単一選択でズーム連動） */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">
            都道府県
            <span className="ml-1 font-normal text-slate-400">（1県のみ選択で地図ズーム）</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PREFECTURES.map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => togglePref(pref)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedPrefectures.has(pref)
                    ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-100"
                }`}
              >
                {pref.replace("県", "")}
              </button>
            ))}
          </div>
        </div>

        {/* 種別フィルター */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">種別</p>
          <div className="flex flex-wrap gap-1.5">
            {SIGHTING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedTypes.has(type)
                    ? TYPE_COLORS[type]
                    : "border-slate-300 bg-white text-slate-400 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${selectedTypes.has(type) ? TYPE_DOT[type] : "bg-slate-300"}`}
                />
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 月フィルター */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">
            月別{" "}
            <span className="font-normal text-slate-400">
              (未選択 = 全月)
            </span>
          </p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                className={`h-7 w-7 rounded-full border text-xs font-medium transition-colors ${
                  selectedMonths.has(m)
                    ? "border-orange-400 bg-orange-100 text-orange-800"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-100"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 件数表示 */}
      <p className="text-sm text-slate-600">
        <span className="font-bold text-slate-800">{filtered.length}</span>件表示中
        {filtered.length < BEAR_SIGHTINGS_REAL.length && (
          <span className="ml-1 text-slate-400">/ 全{BEAR_SIGHTINGS_REAL.length}件</span>
        )}
      </p>

      {/* 地図 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <BearMapLeaflet
          sightings={filtered}
          onSelectSighting={setSelectedSighting}
          selectedSighting={selectedSighting}
          focusPrefecture={focusPrefecture}
        />
      </div>

      {/* 選択した出没情報の詳細 */}
      {selectedSighting && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-bold ${TYPE_COLORS[selectedSighting.type]}`}
              >
                {selectedSighting.type}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {selectedSighting.prefecture} {selectedSighting.city}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSighting(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-500">{selectedSighting.date}</p>
          <p className="mt-1 text-xs text-slate-600">{selectedSighting.location}</p>
          <p className="mt-2 text-sm text-slate-700">{selectedSighting.description}</p>
          <p className="mt-2 text-xs text-slate-400">出典: {selectedSighting.source}</p>
        </div>
      )}

      {/* 一覧テーブル（モバイル用） */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">出没一覧</p>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filtered.slice(0, 20).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSighting(s)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
            >
              <span
                className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[s.type]}`}
              >
                {s.type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800">
                  {s.prefecture.replace("県", "")} {s.city} — {s.location}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{s.description}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{s.date.replace(/^\d{4}-/, "")}</span>
            </button>
          ))}
          {filtered.length > 20 && (
            <p className="px-4 py-3 text-center text-xs text-slate-400">
              他 {filtered.length - 20}件（地図上で確認できます）
            </p>
          )}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              条件に一致するデータがありません
            </p>
          )}
        </div>
      </div>

      {/* データ出典 */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">データ出典</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>富山県 クマっぷ（富山県環境政策課）</li>
          <li>秋田県 ツキノワグマ情報 / クマダス（kumadas.net）</li>
          <li>石川県 ツキノワグマ目撃痕跡情報（石川県自然環境課）</li>
          <li>長野県 けものおと2（長野県林務部）</li>
          <li>新潟県 にいがたクマ出没マップ（ArcGISダッシュボード）</li>
        </ul>
        <p className="text-slate-400">
          ※座標は市町村中心座標からの近似値です。実際の位置と異なる場合があります。
        </p>
      </div>
    </div>
  );
}
