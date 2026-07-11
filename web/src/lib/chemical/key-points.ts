import type {
  ChemicalRaResponse,
  GhsHazard,
  SafetyMeasure,
} from "@/app/api/chemical-ra/route";

/**
 * 化学物質RA結果の「まず押さえる要点」抽出（軸I: 機能の中身の直感性）。
 *
 * 結果画面はGHS分類・濃度基準・保護具・安全対策・規制…と情報が多く、専門家でない
 * 担当者には「結局この物質の一番の危険は何で、まず何をすればいいか」が埋もれやすい。
 * 既存のレスポンスから、(1)主な危険性 (2)まず行う対策 を平易に取り出す純関数。
 * (3)該当する主な法規制のバッジは AI 自由文からは導出せず、監査済み legal-profile
 * 由来のタグ（auditedRegulations 引数）をそのまま用いる。
 */
export type ChemicalKeyPoints = {
  /** 主な危険性（注意喚起語「危険」を優先、最大3件）。 */
  hazards: { category: string; signal?: string }[];
  /** まず行う対策（優先度順、最大3件のアクション文）。 */
  actions: string[];
  /** 該当する主な法規制の短縮タグ（特化則・有機則 等）。 */
  regulations: string[];
};

/** 注意喚起語の重み（「危険」を最上位に）。 */
function signalWeight(signal?: string): number {
  if (signal === "危険") return 0;
  if (signal === "警告") return 1;
  return 2;
}

export function getChemicalKeyPoints(
  result: Pick<ChemicalRaResponse, "ghsHazards" | "safetyMeasures">,
  /**
   * 法規制バッジ（監査済み legal-profile 由来。lib/chemical/legal-profile-tags.ts）。
   * P0是正(2026-07-11): 以前はここで regulatoryNotes（AI自由文）への言及正規表現から
   * タグを抽出していたが、「特定化学物質障害予防規則：非該当」等の否定文でも
   * 偽バッジが点灯した（本番カプサイシンで実発生）。該当法令のバッジは
   * 正本突合済みデータからのみ受け取り、自由文からは二度と導出しない。
   */
  auditedRegulations: readonly string[] = [],
): ChemicalKeyPoints {
  const hazards = [...(result.ghsHazards ?? [])]
    .sort((a: GhsHazard, b: GhsHazard) => signalWeight(a.signal) - signalWeight(b.signal))
    .slice(0, 3)
    .map((h) => ({ category: h.category, signal: h.signal }));

  const actions = [...(result.safetyMeasures ?? [])]
    .sort(
      (a: SafetyMeasure, b: SafetyMeasure) =>
        (a.priority ?? 99) - (b.priority ?? 99),
    )
    .map((m) => m.action)
    .filter((a) => a && a.trim().length > 0)
    .slice(0, 3);

  return { hazards, actions, regulations: [...new Set(auditedRegulations)] };
}

/** 表示に足る要点があるか（全て空なら要点カードを出さない）。 */
export function hasKeyPoints(kp: ChemicalKeyPoints): boolean {
  return kp.hazards.length > 0 || kp.actions.length > 0 || kp.regulations.length > 0;
}
