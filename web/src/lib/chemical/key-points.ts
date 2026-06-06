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
 * 既存のレスポンスから、(1)主な危険性 (2)まず行う対策 (3)該当する主な法規制 だけを
 * 平易に取り出す純関数。新たなデータ生成やAI呼び出しはしない（既存結果の再構成）。
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

/** 規制ノート文から抽出する既知の規制短縮名（出現順・重複排除）。 */
const REGULATION_TAGS: { tag: string; pattern: RegExp }[] = [
  { tag: "特化則", pattern: /特定化学物質|特化則/ },
  { tag: "有機則", pattern: /有機溶剤|有機則/ },
  { tag: "鉛則", pattern: /鉛中毒|鉛則/ },
  { tag: "粉じん則", pattern: /粉じん則|じん肺/ },
  { tag: "石綿則", pattern: /石綿|アスベスト/ },
  { tag: "酸欠則", pattern: /酸素欠乏|酸欠/ },
  { tag: "安衛法57条の3（RA義務）", pattern: /リスクアセスメント対象物|57条の3|表示・通知対象/ },
];

export function getChemicalKeyPoints(
  result: Pick<ChemicalRaResponse, "ghsHazards" | "safetyMeasures" | "regulatoryNotes">,
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

  const notes = (result.regulatoryNotes ?? []).join(" ");
  const regulations: string[] = [];
  for (const { tag, pattern } of REGULATION_TAGS) {
    if (pattern.test(notes) && !regulations.includes(tag)) regulations.push(tag);
  }

  return { hazards, actions, regulations };
}

/** 表示に足る要点があるか（全て空なら要点カードを出さない）。 */
export function hasKeyPoints(kp: ChemicalKeyPoints): boolean {
  return kp.hazards.length > 0 || kp.actions.length > 0 || kp.regulations.length > 0;
}
