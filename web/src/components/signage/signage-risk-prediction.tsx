"use client";

import type { SiteRiskWeather } from "@/lib/types/domain";

type Props = {
  weatherData?: SiteRiskWeather | null;
  status?: "idle" | "loading" | "success" | "error";
};

/**
 * 独自の事故・WBGT・強風「予測」は、入力条件と根拠の独立検証が完了するまで表示しない。
 * ここでは取得状態と、利用者が次に確認すべき一次情報・現場実測だけを示す。
 */
export function SignageRiskPrediction({
  weatherData,
  status = "success",
}: Props) {
  const liveForecast =
    status === "success" && weatherData?.dataOrigin === "live";

  return (
    <section className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base xl:text-xl">
          本日の追加確認
        </h2>
        <a
          href="/risk"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-blue-600/60 px-2 py-1 text-[9px] font-semibold text-blue-300 hover:bg-blue-950/50 sm:text-[10px] xl:text-sm"
          target="_blank"
          rel="noreferrer"
        >
          気象・地域リスクを確認 →
        </a>
      </div>

      {status !== "success" ? (
        <div
          role="status"
          className={`mt-2 rounded-lg border p-3 text-sm font-bold ${
            status === "error"
              ? "border-amber-400 bg-amber-950/70 text-amber-100"
              : "border-slate-500 bg-slate-800 text-slate-200"
          }`}
        >
          {status === "error"
            ? "取得できません。気象庁で確認してください。"
            : "取得中です。"}
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-amber-500/60 bg-amber-950/50 p-3 text-amber-50">
          <p className="text-xs font-bold sm:text-sm xl:text-xl">
            {liveForecast ? "現場条件を確認してKYを実施" : "公式情報を確認"}
          </p>
        </div>
      )}
    </section>
  );
}
