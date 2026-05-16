"use client";

import { useLanguage } from "@/contexts/language-context";

interface AccidentsMetaInfoProps {
  total: number;
  mhlw: number;
  curated: number;
  synthetic: number;
  preliminary?: number;
}

export function AccidentsMetaInfo({ total, mhlw, curated, synthetic, preliminary = 0 }: AccidentsMetaInfoProps) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-600">
        {isEn ? `${total} cases (` : `収録 ${total} 件（`}
        <span className="font-semibold text-emerald-700">
          {isEn ? `MHLW ${mhlw}` : `厚労省 ${mhlw}`}
        </span>
        ／<span className="font-semibold text-sky-700">curated {curated}</span>
        {preliminary > 0 ? (
          <>
            ／
            <span
              className="font-semibold text-orange-700"
              title={
                isEn
                  ? "Representative pattern cases derived from MHLW monthly preliminary tallies — not individual records."
                  : "厚労省月次速報集計値から導出した代表パターン事例。実報告（個票）ではありません。"
              }
            >
              {isEn ? `representative ${preliminary}` : `想定例 ${preliminary}`}
            </span>
          </>
        ) : null}
        {synthetic > 0 ? (
          <>
            ／
            <span className="font-semibold text-amber-700">
              {isEn ? `synthetic ${synthetic}` : `合成 ${synthetic}`}
            </span>
          </>
        ) : null}
        {isEn ? ")" : "）"}
      </span>
    </>
  );
}

export function AccidentsMetaCaption() {
  const { language } = useLanguage();
  const isEn = language === "en";
  if (isEn) {
    return (
      <p className="mt-1 text-[10px] text-slate-500">
        Breakdown: see{" "}
        <a href="/about/data-sources" className="underline hover:text-slate-700">
          Data sources
        </a>
        . <strong>MHLW</strong> = re-curated from the workplace-safety site,{" "}
        <strong>curated</strong> = open data restructured by the editorial team (proper nouns anonymized),{" "}
        <span className="font-semibold text-orange-700">representative (preliminary-based)</span>{" "}
        = synthetic example cases derived from MHLW monthly preliminary tallies — NOT real individual reports. Will be replaced with mhlw/curated once the R07 worker injury/illness open dataset is released,{" "}
        <strong>synthetic</strong> = training-coverage supplements.
      </p>
    );
  }
  return (
    <p className="mt-1 text-[10px] text-slate-500">
      内訳の定義:{" "}
      <a href="/about/data-sources" className="underline hover:text-slate-700">
        データソース一覧
      </a>{" "}
      を参照。<strong>厚労省</strong> = 職場のあんぜんサイト由来の再収録、
      <strong>curated</strong> = 公開情報・統計を編集部が再構成（固有名詞匿名化）、
      <span className="font-semibold text-orange-700">想定例(速報基準)</span>{" "}
      = 厚労省月次速報集計値から統計的に導出した代表パターン事例（実報告ではない合成事例）。確定個票（R07労働者死傷病報告オープンデータ）公開後に mhlw/curated へ置換予定、
      <strong>合成</strong> = 教材用カバレッジ補完事例。
    </p>
  );
}

export function AccidentsPreliminaryBanner() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <p className="mt-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] text-orange-800">
      ⚠{" "}
      <strong>
        {isEn
          ? "2025-2026 cases include preliminary values."
          : "2025〜2026年の事例は速報値を含みます。"}
      </strong>{" "}
      {isEn
        ? "Representative pattern cases based on Reiwa 7 preliminary (684 industry-wide fatalities, March 2026 tally) and Reiwa 8 preliminary (April 2026 tally). Individual records (worker injury/illness reports, R07 open data) are not yet public — see the "
        : "令和7年速報（全産業死亡684人・2026年3月集計）および令和8年速報（2026年4月集計）に基づく代表パターン事例です。確定個票（労働者死傷病報告 R07オープンデータ）は未公開のため、"}
      <a
        href="https://anzeninfo.mhlw.go.jp/information/sokuhou.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {isEn ? "MHLW preliminary page" : "厚労省速報ページ"}
      </a>
      {isEn ? " for the latest tallies." : "で最新集計値をご確認ください。"}
    </p>
  );
}

export function AccidentsAnalyticsBanner({ totalLabel }: { totalLabel: string }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-900 sm:text-base">
            {isEn ? "📊 Accident statistics dashboard" : "📊 事故統計ダッシュボード"}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-800 sm:text-xs">
            {isEn
              ? `Visualize ${totalLabel} cases across 25 analytical axes — year, month, industry, accident type, region, scale.`
              : `収録 ${totalLabel} 件を、年・月・業種・事故種類・地域・規模など 25 種類の分析軸で可視化。`}
          </p>
        </div>
        <a
          href="/accidents-analytics"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 sm:text-sm"
        >
          {isEn ? "Open dashboard →" : "ダッシュボードを開く →"}
        </a>
      </div>
    </div>
  );
}
