import type { AccidentCase, AccidentType } from "@/lib/types/domain";
import { ALL_ACCIDENT_TYPES } from "@/lib/types/domain";
import type { SafetyTone } from "@/lib/design/safety-tone";

/**
 * 事故DBの視覚言語（柱0・脱テキスト）。
 * - 重篤度→JIS安全色トーンの対応（色文法を一箇所で固定）
 * - 事故の型ごとの件数集計（型グリッドのデカ数字の単一ソース)
 *
 * 色文法の約束:
 * - 死亡＝赤solid（停止級・最も重い表示）
 * - 重傷＝赤soft
 * - 中等傷＝黄soft
 * - 軽傷＝グレーsoft（負傷は「安全・OK」ではないので緑は使わない）
 */

export type AccidentSeverity = AccidentCase["severity"];

export type SeverityVisual = {
  tone: SafetyTone;
  variant: "solid" | "soft";
};

export const SEVERITY_VISUAL: Record<AccidentSeverity, SeverityVisual> = {
  死亡: { tone: "danger", variant: "solid" },
  重傷: { tone: "danger", variant: "soft" },
  中等傷: { tone: "warning", variant: "soft" },
  軽傷: { tone: "neutral", variant: "soft" },
};

export type AccidentTypeCount = {
  type: AccidentType;
  count: number;
};

/**
 * 事故の型ごとの件数（件数降順・0件の型は出さない）。
 * 同数の場合は ALL_ACCIDENT_TYPES の公式並び順を保つ。
 */
export function computeAccidentTypeCounts(cases: Pick<AccidentCase, "type">[]): AccidentTypeCount[] {
  const counts = new Map<AccidentType, number>();
  for (const c of cases) {
    counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  }
  return ALL_ACCIDENT_TYPES.filter((type) => (counts.get(type) ?? 0) > 0)
    .map((type) => ({ type, count: counts.get(type) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 型グリッドのタイルから一覧の絞り込み結果へ直行するURL。
 * QuickAccidentSearch と同じ「フル遷移で tab=list を復元」する導線を使い、
 * acc_type は home-screen がマウント時に読み取って型フィルタへ反映する。
 */
export function accidentTypeHref(type: AccidentType): string {
  const params = new URLSearchParams();
  params.set("tab", "list");
  params.set("acc_type", type);
  return `/accidents?${params.toString()}#accident-results`;
}
