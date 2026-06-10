import type { ReactNode } from "react";
import type {
  AcclimatizationState,
  RiskLevel,
  WorkIntensity,
} from "@/types/heat-illness";
import {
  buildRiskScale,
  riskMarkerPercent,
  RISK_VISUAL,
} from "@/lib/heat-illness/risk-visual";

/**
 * WBGT結論カード＋危険度色帯ゲージ（柱0・ビジュアルファースト）。
 * 「WBGT値と危険度色帯を画面の主役に」の実体 — 本文を読まなくても
 * デカ数字（text-6xl）・区分チップ・色帯上のマーカー位置で
 * 「いまの危険度」と「次にやること」が3秒で分かることが役目。
 *
 * 計算機・日次記録簿で共用する。境界値はリスク判定エンジンと同一ソース。
 */

type WbgtConclusionProps = {
  wbgt: number;
  level: RiskLevel;
  /** デカ数字の上に出す状態の短ラベル（例「いまの危険度」「本日の最高WBGT」） */
  heading: string;
  /** 1行だけの補足（エンジンの summary を想定） */
  summary?: string;
  workIntensity: WorkIntensity;
  acclimatization: AcclimatizationState;
  /** 次アクションのチップ列など */
  children?: ReactNode;
  className?: string;
};

export function WbgtConclusion({
  wbgt,
  level,
  heading,
  summary,
  workIntensity,
  acclimatization,
  children,
  className = "",
}: WbgtConclusionProps) {
  const v = RISK_VISUAL[level];
  return (
    <section
      role="status"
      aria-label={`${heading}: WBGT ${wbgt.toFixed(1)}度 ${v.label}`}
      data-testid="wbgt-conclusion"
      className={`rounded-2xl border-2 ${v.soft} p-4 sm:p-5 ${className}`}
    >
      <p className="text-xs font-semibold opacity-70">{heading}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          data-testid="wbgt-big-value"
          className={`text-6xl font-bold leading-none tracking-tight ${v.text}`}
        >
          {wbgt.toFixed(1)}
          <span className="ml-1 text-2xl font-bold">℃</span>
        </span>
        <span
          data-testid="wbgt-risk-chip"
          className={`inline-flex items-center rounded-xl px-4 py-2 text-xl font-bold ${v.chip}`}
        >
          {v.label}
        </span>
      </div>
      <WbgtRiskBand
        wbgt={wbgt}
        workIntensity={workIntensity}
        acclimatization={acclimatization}
        className="mt-4"
      />
      {summary && <p className="mt-3 text-sm font-semibold leading-6">{summary}</p>}
      {children && (
        <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>
      )}
    </section>
  );
}

type WbgtRiskBandProps = {
  wbgt: number;
  workIntensity: WorkIntensity;
  acclimatization: AcclimatizationState;
  className?: string;
};

/**
 * 5区分の危険度色帯。現在の作業強度・順化状況の境界値（℃）を帯の下に表示し、
 * 現在値の位置を ▼ マーカーで示す。
 */
export function WbgtRiskBand({
  wbgt,
  workIntensity,
  acclimatization,
  className = "",
}: WbgtRiskBandProps) {
  const scale = buildRiskScale(workIntensity, acclimatization);
  const percent = riskMarkerPercent(wbgt, scale);
  return (
    <div className={className} data-testid="wbgt-band">
      <div className="relative pt-3">
        <span
          aria-hidden="true"
          className="absolute top-0 -translate-x-1/2 text-sm leading-none text-slate-800 dark:text-slate-100"
          style={{ left: `${percent}%` }}
        >
          ▼
        </span>
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {scale.map((seg) => (
            <div
              key={seg.level}
              data-testid={`wbgt-band-seg-${seg.level}`}
              className={`h-full flex-1 ${RISK_VISUAL[seg.level].bar} ${
                seg.level === "safe" ? "" : "border-l border-white/60"
              }`}
              title={seg.label}
            />
          ))}
        </div>
      </div>
      <div className="relative mt-0.5 h-4 text-[10px] font-semibold text-slate-500">
        {scale.slice(1).map((seg, i) => (
          <span
            key={seg.level}
            className="absolute -translate-x-1/2"
            style={{ left: `${((i + 1) / scale.length) * 100}%` }}
          >
            {seg.fromC}
          </span>
        ))}
      </div>
      <div className="flex text-[10px] font-semibold text-slate-500">
        {scale.map((seg) => (
          <span key={seg.level} className="flex-1 text-center">
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
