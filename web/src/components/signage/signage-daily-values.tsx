"use client";

import { useEffect, useState } from "react";
import {
  noAccidentDays,
  pickDailySlogan,
} from "@/lib/signage/daily-values";
import { getNoAccidentStartDate } from "@/lib/signage/no-accident-store";

type Props = {
  now: Date;
  /** 現在時刻に最も近い気温(℃)。/api/signage-data の hourly[0] を想定 */
  currentTempC?: number;
  /** 現在時刻に最も近い相対湿度(%)。上流(Open-Meteo)が欠測の場合は undefined */
  currentHumidityPct?: number;
};

/**
 * サイネージ常掲価値の3項目（Fable診断01 T10）: 無災害日数・今日の一言(唱和)・WBGT。
 * 「毎日見ても内容が変わる」ことで常時掲示の存在価値を作る。結論ストリップの下、
 * シナリオ操作バーの上に置き、キオスクモードでも常に表示する（運用UIではなく本文のため）。
 */
export function SignageDailyValues({ now }: Props) {
  const [startDate, setStartDate] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageは描画後にのみ参照可（SSRハイドレーション差異回避）
    setStartDate(getNoAccidentStartDate());
  }, []);

  const days = startDate ? noAccidentDays(startDate, now) : null;
  const slogan = pickDailySlogan(now);

  return (
    <div className="grid shrink-0 grid-cols-3 gap-2">
      <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-700/60 bg-slate-900/70 px-1 py-1.5 text-center sm:py-2">
        <p className="text-[9px] font-semibold text-emerald-300 sm:text-[10px] xl:text-base">無災害日数</p>
        {days !== null ? (
          <p className="text-lg font-extrabold tabular-nums text-white sm:text-2xl xl:text-5xl">
            {days}
            <span className="ml-0.5 text-[10px] font-semibold text-slate-300 sm:text-xs xl:text-lg">日</span>
          </p>
        ) : (
          <p className="text-xs font-bold text-slate-300 xl:text-lg">
            未設定
          </p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-sky-700/50 bg-sky-950/40 px-2 py-1.5 text-center sm:py-2">
        <p className="text-[9px] font-semibold text-sky-300 sm:text-[10px] xl:text-base">今日の一言</p>
        <p className="line-clamp-2 text-xs font-bold leading-snug text-white sm:text-sm xl:text-2xl">{slogan}</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-500/60 bg-slate-900/70 px-1 py-1.5 text-center sm:py-2">
        <p className="text-[9px] font-semibold sm:text-[10px] xl:text-base">暑さ指数(WBGT)</p>
        <p className="text-[10px] font-bold text-amber-200 xl:text-sm">実測計で確認</p>
      </div>
    </div>
  );
}
