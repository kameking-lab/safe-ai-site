import type { AccidentCase, AccidentProvenance } from "@/lib/types/domain";
import { realAccidentCases } from "@/data/mock/real-accident-cases";
import { realAccidentCasesExtra } from "@/data/mock/real-accident-cases-extra";
import { realAccidentCasesExtra2 } from "@/data/mock/real-accident-cases-extra2";
import { realAccidentCasesExtra3 } from "@/data/mock/real-accident-cases-extra3";
import { realAccidentCasesDiverseIndustries } from "@/data/mock/real-accident-cases-diverse-industries";
import { realAccidentCases20242026 } from "@/data/mock/real-accident-cases-2024-2026";

/**
 * 実データ（厚労省「職場のあんぜんサイト」労働災害事例）と、編集部 curated 事例を収録。
 * 各事例は provenance フィールドで mhlw / curated / synthetic を区別する
 * （未指定の場合は ID プレフィクスから自動推定）。
 */
let cachedAccidents: AccidentCase[] | null = null;

function toSortKey(occurredOn: string | undefined): number {
  if (!occurredOn) return 0;
  const match = occurredOn.match(/(\d{4})\D*(\d{1,2})?\D*(\d{1,2})?/);
  if (!match) return 0;
  const year = Number(match[1] ?? 0);
  const month = Number(match[2] ?? 1);
  const day = Number(match[3] ?? 1);
  return year * 10000 + month * 100 + day;
}

/**
 * provenance が未指定の事例について ID プレフィクスから推定。
 * - mhlw-* / mhlw_* : 厚労省 職場のあんぜんサイト由来
 * - industry-*     : 業種カバレッジ補完用 curated
 * - curated-*      : 編集部 curated（公開情報の再構成）
 * - synthetic-*    : 教材用合成事例
 * - その他         : curated 扱い（公開情報ベースの再構成）
 */
function inferProvenance(c: AccidentCase): AccidentProvenance {
  if (c.provenance) return c.provenance;
  const id = c.id.toLowerCase();
  if (id.startsWith("mhlw-") || id.startsWith("mhlw_")) return "mhlw";
  if (id.startsWith("synthetic-")) return "synthetic";
  return "curated";
}

export function getAccidentCasesDataset(): AccidentCase[] {
  if (!cachedAccidents) {
    const merged: AccidentCase[] = [
      ...realAccidentCases,
      ...realAccidentCasesExtra,
      ...realAccidentCasesExtra2,
      ...realAccidentCasesExtra3,
      ...realAccidentCasesDiverseIndustries,
      ...realAccidentCases20242026,
    ].map((c) => ({ ...c, provenance: inferProvenance(c) }));
    merged.sort((a, b) => toSortKey(b.occurredOn) - toSortKey(a.occurredOn));
    cachedAccidents = merged;
  }
  return cachedAccidents;
}

/** provenance ごとの件数集計（UI ディスクレーマー用） */
export function getAccidentProvenanceCounts(): Record<AccidentProvenance, number> {
  const counts: Record<AccidentProvenance, number> = { mhlw: 0, curated: 0, synthetic: 0 };
  for (const c of getAccidentCasesDataset()) {
    counts[c.provenance ?? "curated"] += 1;
  }
  return counts;
}

/** @deprecated getAccidentCasesDataset を推奨 */
export const accidentCasesMock = getAccidentCasesDataset();
