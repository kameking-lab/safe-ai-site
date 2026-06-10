import { Shield } from "lucide-react";
import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import type { ChemicalKeyPoints } from "@/lib/chemical/key-points";
import {
  computeRaConclusion,
  raLevelMarkerPercent,
  RA_LEVEL_ORDER,
  RA_LEVEL_VISUAL,
} from "@/lib/chemical/ra-visual";
import { collectGhsSymbols } from "@/lib/chemical/ghs-pictogram-map";
import { GhsPictogram } from "@/components/chemical/ghs-pictogram";

/**
 * RA結果の結論カード（柱0・1画面1メッセージ）。
 * 本文を読まずに3秒で「いまの危険度」と「次にやること」が分かることが役目:
 * リスクレベルのデカ表示＋I〜IV色帯＋GHS絵表示＋まず行う対策＋保護具への動線。
 * A4印刷では文字情報は出し、装飾的な帯と絵の列は出さない（正式書式を保つ）。
 */

type RaConclusionCardProps = {
  result: ChemicalRaResponse;
  keyPoints: ChemicalKeyPoints;
  /** 保護具AIファインダーへのリンク（必要保護具の動線） */
  equipmentHref: string;
};

export function RaConclusionCard({ result, keyPoints, equipmentHref }: RaConclusionCardProps) {
  const conclusion = computeRaConclusion(result);
  const symbols = collectGhsSymbols(result.ghsHazards ?? []);
  const v = conclusion.visual;
  return (
    <section
      role="status"
      aria-label={`判定結果: ${conclusion.title}`}
      data-testid="ra-conclusion"
      className={`rounded-2xl border-2 p-4 sm:p-5 ${v.soft}`}
    >
      {/* 主役: レベル/注意喚起語のデカ表示＋物質名 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          {conclusion.kind === "level" && (
            <span className={`text-base font-bold ${v.text}`}>リスク</span>
          )}
          <span
            data-testid="ra-big-value"
            className={`font-bold leading-none tracking-tight ${v.text} ${
              conclusion.kind === "level" ? "text-6xl" : "text-5xl"
            }`}
          >
            {conclusion.big}
          </span>
          <span
            data-testid="ra-conclusion-chip"
            className={`rounded-full px-2.5 py-1 text-sm font-bold ${v.chip}`}
          >
            {conclusion.title}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{result.chemicalName}</p>
          {conclusion.kind === "level" && result.createSimple && (
            <p className="text-[11px] opacity-80">
              CREATE-SIMPLE 簡易判定・ばく露指数 {result.createSimple.exposureRatio.toFixed(2)}
            </p>
          )}
          {conclusion.kind === "info" && (
            <p className="text-[11px] opacity-80">
              上の「作業の状況」で換気・取扱量を選ぶとリスクレベル（I〜IV）を判定します
            </p>
          )}
        </div>
      </div>

      {/* I〜IV 色帯（順序尺度・現在レベルの中央に▼）。印刷では出さない */}
      {conclusion.kind === "level" && (
        <div className="mt-3 print:hidden" data-testid="ra-level-band">
          <div className="relative pt-3">
            <span
              aria-hidden="true"
              className="absolute top-0 -translate-x-1/2 text-xs font-bold"
              style={{ left: `${raLevelMarkerPercent(conclusion.level)}%` }}
            >
              ▼
            </span>
            <div className="flex h-3 overflow-hidden rounded-full">
              {RA_LEVEL_ORDER.map((lv) => (
                <span
                  key={lv}
                  data-testid={`ra-band-seg-${lv}`}
                  className={`h-full flex-1 ${RA_LEVEL_VISUAL[lv].bar}`}
                />
              ))}
            </div>
            <div className="mt-0.5 flex text-[10px] font-semibold opacity-70">
              {RA_LEVEL_ORDER.map((lv) => (
                <span key={lv} className="flex-1 text-center">
                  {lv} {RA_LEVEL_VISUAL[lv].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GHS絵表示の列（ドラム缶ラベルと同じ視覚言語）。印刷では出さない */}
      {symbols.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 print:hidden" data-testid="ra-ghs-pictos">
          {symbols.map((s) => (
            <GhsPictogram key={s} symbol={s} />
          ))}
          <span className="ml-1 text-[10px] font-semibold opacity-70">GHS絵表示</span>
        </div>
      )}

      {/* 主な危険性チップ（最大3・印刷にも出す＝記録の要点） */}
      {keyPoints.hazards.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {keyPoints.hazards.map((h, i) => (
            <li
              key={`${h.category}-${i}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                h.signal === "危険" ? "bg-rose-700 text-white" : "border border-rose-200 bg-white text-rose-800"
              }`}
            >
              {h.signal ? <span className="text-[10px] opacity-90">{h.signal}</span> : null}
              {h.category}
            </li>
          ))}
        </ul>
      )}

      {/* 次にやること: まず行う対策（優先度順）＋レベルIVは作業中止を最前面に */}
      {conclusion.kind === "level" && conclusion.level === "IV" && (
        <p className="mt-3 rounded-lg bg-rose-800 px-3 py-2 text-sm font-bold text-white">
          ⚠ 原則 作業中止 — 代替化・密閉化・局所排気装置の即時設置が必要です
        </p>
      )}
      {keyPoints.actions.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold opacity-70">まず行う対策（優先度順）</p>
          <ol className="mt-1 space-y-1">
            {keyPoints.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs font-semibold">
                <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${v.chip}`}>
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 保護具への動線（44px以上）＋法規制タグ */}
      <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
        <a
          href={equipmentHref}
          data-testid="ra-equipment-link"
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition hover:opacity-90 ${v.chip}`}
        >
          <Shield className="h-4 w-4" aria-hidden="true" />
          必要な保護具を見る →
        </a>
        {keyPoints.regulations.map((r) => (
          <span
            key={r}
            className="inline-flex items-center rounded-md border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-800"
          >
            {r}
          </span>
        ))}
      </div>
    </section>
  );
}
