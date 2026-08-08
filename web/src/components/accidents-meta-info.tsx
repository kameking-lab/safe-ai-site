"use client";

import { AlertTriangle, BarChart3 } from "lucide-react";
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
          {isEn
            ? `primary-source verified ${mhlw}`
            : `一次資料照合済み ${mhlw}`}
        </span>
        ／<span className="font-semibold text-sky-700">編集済み {curated}</span>
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
              {isEn ? `learning examples ${synthetic}` : `架空の学習例 ${synthetic}`}
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
        . <strong>primary-source verified</strong> = the local record and an
        official individual case have been checked as the same material,{" "}
        <strong>edited</strong> = public information restructured by the
        editorial team, including records whose individual primary source has
        not yet been verified,{" "}
        <span className="font-semibold text-orange-700">representative (preliminary-based)</span>{" "}
        = example cases derived from MHLW monthly preliminary tallies — NOT real individual reports. Will be replaced after the R07 worker injury/illness open dataset is released,{" "}
        <strong>learning examples</strong> = fictional training supplements.
      </p>
    );
  }
  return (
    <p className="mt-1 text-[10px] text-slate-500">
      内訳の定義:{" "}
      <a href="/about/data-sources" className="underline hover:text-slate-700">
        データソース一覧
      </a>{" "}
      を参照。<strong>一次資料照合済み</strong> =
      ローカル本文と公式個票が同一資料であることを確認できたもの、
      <strong>編集済み</strong> =
      公開情報・統計を編集部が再構成したもの（個別の一次資料を未照合の記録を含む）、
      <span className="font-semibold text-orange-700">想定例(速報基準)</span>{" "}
      = 厚労省月次速報集計値から導出した代表パターン事例（実報告ではない架空例）。確定個票（R07労働者死傷病報告オープンデータ）公開後に置換予定、
      <strong>架空の学習例</strong> = 実事故ではない教材用事例。
    </p>
  );
}

export function AccidentsPreliminaryBanner() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <p className="mt-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] text-orange-800">
      <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
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
            <BarChart3 className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
            {isEn ? "Accident statistics dashboard" : "事故統計ダッシュボード"}
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
