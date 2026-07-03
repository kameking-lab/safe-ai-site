"use client";

import { useEffect, useState } from "react";
import {
  computeSignageWbgt,
  noAccidentDays,
  pickDailySlogan,
  todayIsoLocal,
} from "@/lib/signage/daily-values";
import { getNoAccidentStartDate, setNoAccidentStartDate } from "@/lib/signage/no-accident-store";
import type { RiskAssessment } from "@/types/heat-illness";

type Props = {
  now: Date;
  /** 現在時刻に最も近い気温(℃)。/api/signage-data の hourly[0] を想定 */
  currentTempC?: number;
  /** 現在時刻に最も近い相対湿度(%)。上流(Open-Meteo)が欠測の場合は undefined */
  currentHumidityPct?: number;
};

// JIS安全色文法（柱0）: 黄・橙は黒系文字、赤系は白文字。
const WBGT_TONE: Record<RiskAssessment["color"], string> = {
  emerald: "border-emerald-600/50 bg-emerald-950/40 text-emerald-100",
  amber: "border-amber-300 bg-amber-400 text-amber-950",
  orange: "border-orange-300 bg-orange-500 text-orange-950",
  red: "border-rose-400 bg-rose-700 text-white",
  rose: "border-rose-300 bg-rose-800 text-white",
};

/**
 * サイネージ常掲価値の3項目（Fable診断01 T10）: 無災害日数・今日の一言(唱和)・WBGT。
 * 「毎日見ても内容が変わる」ことで常時掲示の存在価値を作る。結論ストリップの下、
 * シナリオ操作バーの上に置き、キオスクモードでも常に表示する（運用UIではなく本文のため）。
 */
export function SignageDailyValues({ now, currentTempC, currentHumidityPct }: Props) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [editingStart, setEditingStart] = useState(false);
  const [draftDate, setDraftDate] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageは描画後にのみ参照可（SSRハイドレーション差異回避）
    setStartDate(getNoAccidentStartDate());
  }, []);

  const days = startDate ? noAccidentDays(startDate, now) : null;
  const slogan = pickDailySlogan(now);
  const wbgt = typeof currentTempC === "number" ? computeSignageWbgt(currentTempC, currentHumidityPct) : null;

  function handleSaveStartDate() {
    if (!draftDate) return;
    setNoAccidentStartDate(draftDate);
    setStartDate(draftDate);
    setEditingStart(false);
  }

  return (
    <div className="grid shrink-0 grid-cols-3 gap-2">
      <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-700/60 bg-slate-900/70 px-1 py-1.5 text-center sm:py-2">
        <p className="text-[9px] font-semibold text-emerald-300 sm:text-[10px] xl:text-base">無災害日数</p>
        {days !== null ? (
          <>
            <p className="text-lg font-extrabold tabular-nums text-white sm:text-2xl xl:text-5xl">
              {days}
              <span className="ml-0.5 text-[10px] font-semibold text-slate-300 sm:text-xs xl:text-lg">日</span>
            </p>
            {!editingStart && (
              <button
                type="button"
                onClick={() => {
                  setDraftDate(startDate ?? "");
                  setEditingStart(true);
                }}
                className="min-h-[44px] text-[8px] text-slate-400 underline sm:text-[9px] xl:text-sm"
              >
                起点日を変更
              </button>
            )}
          </>
        ) : (
          !editingStart && (
            <button
              type="button"
              onClick={() => {
                setDraftDate(todayIsoLocal(now));
                setEditingStart(true);
              }}
              className="min-h-[44px] rounded border border-emerald-600/60 px-2 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-950/50 xl:text-sm"
            >
              起点日を設定
            </button>
          )
        )}
        {editingStart && (
          <div className="mt-1 flex items-center gap-1">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              aria-label="無災害日数の起点日"
              className="min-h-[44px] w-[104px] rounded border border-slate-600 bg-slate-800 px-1 text-[10px] text-white"
            />
            <button
              type="button"
              onClick={handleSaveStartDate}
              className="min-h-[44px] shrink-0 rounded bg-emerald-600 px-2 text-[10px] font-bold text-white hover:bg-emerald-500"
            >
              保存
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-sky-700/50 bg-sky-950/40 px-2 py-1.5 text-center sm:py-2">
        <p className="text-[9px] font-semibold text-sky-300 sm:text-[10px] xl:text-base">今日の一言</p>
        <p className="line-clamp-2 text-xs font-bold leading-snug text-white sm:text-sm xl:text-2xl">{slogan}</p>
      </div>

      <div
        className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center sm:py-2 ${
          wbgt ? WBGT_TONE[wbgt.risk.color] : "border-slate-700/60 bg-slate-900/70"
        }`}
      >
        <p className="text-[9px] font-semibold sm:text-[10px] xl:text-base">暑さ指数(WBGT)</p>
        {wbgt ? (
          <>
            <p className="text-lg font-extrabold tabular-nums sm:text-2xl xl:text-5xl">
              {wbgt.wbgt}
              <span className="ml-0.5 text-[10px] font-semibold sm:text-xs xl:text-lg">℃</span>
            </p>
            <p className="text-[10px] font-bold sm:text-xs xl:text-lg">{wbgt.risk.label}</p>
          </>
        ) : (
          <p className="text-[10px] text-slate-400 xl:text-sm">湿度データ取得中…</p>
        )}
      </div>
    </div>
  );
}
