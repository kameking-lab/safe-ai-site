/**
 * NIQ-REC1: KY作業内容 → 統合事故DBの類似災害事例スコアリング（純粋関数）。
 *
 * スコアカード§5-2で商用HACARUS KY（約3,000件の災害事例から危険提案）に規模負けと
 * 判定したが、当サイトは統合事故DB（curated 実在事例）を既に保有している。本モジュールは
 * KY用紙の「本日の作業内容」テキストから、保有事例の中で関連の高いケースを決定論的に
 * 抽出する。創作は一切せず、既存 AccidentCase のみを返す（AIも外部APIも使わない）。
 *
 * 既存 lib/accidents/ai-relevant.ts の findRelevantAccidents との役割分担:
 * - ai-relevant: /accidents のAI注意喚起用（トークン完全一致主体・業種カテゴリ指定あり）。
 * - 本モジュール: KY作業テキスト向け。作業語（「足場組立」→「足場」）の部分一致と、
 *   作業語→事故の型（足場→墜落 等）の共鳴で、区切り文字のない現場語でも拾えるようにする。
 */

import type { AccidentCase, AccidentType } from "@/lib/types/domain";
import { tokenize } from "@/lib/accidents/ai-relevant";

/**
 * 現場の作業語 → その作業で想起される事故の型。
 * 事例本文に作業語そのものが載っていなくても、事故の「型」で類似事例を引けるようにする。
 * （例: 「足場組立」→ 墜落・飛来落下の事例が本文に「足場」を含まなくても上位に来る）
 */
export const WORK_TERM_TO_TYPES: Readonly<Record<string, readonly AccidentType[]>> = Object.freeze({
  足場: ["墜落", "飛来・落下"],
  高所: ["墜落"],
  屋根: ["墜落"],
  はしご: ["墜落", "転倒"],
  脚立: ["墜落", "転倒"],
  墜落: ["墜落"],
  開口部: ["墜落"],
  解体: ["飛来・落下", "崩壊・倒壊", "墜落"],
  掘削: ["崩壊・倒壊"],
  土止め: ["崩壊・倒壊"],
  型枠: ["崩壊・倒壊", "飛来・落下"],
  鉄筋: ["切れ・こすれ", "飛来・落下"],
  鉄骨: ["墜落", "飛来・落下"],
  建方: ["墜落", "飛来・落下"],
  クレーン: ["飛来・落下", "激突され"],
  玉掛: ["飛来・落下", "激突され"],
  揚重: ["飛来・落下"],
  重機: ["激突され", "はさまれ・巻き込まれ"],
  バックホウ: ["激突され", "はさまれ・巻き込まれ"],
  フォークリフト: ["激突され", "はさまれ・巻き込まれ", "墜落"],
  溶接: ["火災", "有害物等との接触"],
  切断: ["切れ・こすれ", "はさまれ・巻き込まれ"],
  研削: ["切れ・こすれ", "飛来・落下"],
  プレス: ["はさまれ・巻き込まれ"],
  機械: ["はさまれ・巻き込まれ"],
  回転: ["はさまれ・巻き込まれ"],
  コンベヤ: ["はさまれ・巻き込まれ"],
  塗装: ["有害物等との接触"],
  防水: ["火災", "有害物等との接触"],
  電気: ["感電"],
  活線: ["感電"],
  感電: ["感電"],
  運搬: ["動作の反動・無理な動作", "激突され"],
  積込: ["墜落", "はさまれ・巻き込まれ"],
  荷役: ["墜落", "はさまれ・巻き込まれ"],
  倉庫: ["墜落", "激突され"],
  伐採: ["飛来・落下", "激突され"],
  草刈: ["切れ・こすれ", "飛来・落下"],
  くん蒸: ["有害物等との接触", "酸素欠乏"],
  酸欠: ["酸素欠乏"],
  暑熱: ["熱中症"],
  炎天: ["熱中症"],
});

export interface SimilarAccidentHit {
  case: AccidentCase;
  score: number;
  /** マッチの根拠（作業語・型共鳴のどれで拾ったか。UIの説明用） */
  reasons: string[];
}

/** KYの可能性・重大性スケール（1〜3）。KyInstructionRiskRow の likelihood/severity と同型。 */
export type KyLikertScale = 1 | 2 | 3;

/** severity 文字列 → KYの重大性スケール（1〜3）。 */
export function severityToKyScale(severity: AccidentCase["severity"]): KyLikertScale {
  switch (severity) {
    case "死亡":
    case "重傷":
      return 3;
    case "中等傷":
      return 2;
    default:
      return 1;
  }
}

/** occurredOn（"YYYY..." 想定）から降順ソート用の数値キー。 */
function recencyKey(occurredOn: string | undefined): number {
  if (!occurredOn) return 0;
  const m = occurredOn.match(/(\d{4})\D*(\d{1,2})?\D*(\d{1,2})?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 10000 + Number(m[2] ?? 1) * 100 + Number(m[3] ?? 1);
}

/**
 * KY作業テキストから類似災害事例を抽出（スコア降順・上位 limit 件）。
 *
 * スコア:
 *  - 作業語の部分一致（WORK_TERM_TO_TYPES のキーが作業テキストに含まれ、事例本文にも含まれる）: +2
 *  - 型の共鳴（作業語が示す事故の型と事例の type が一致）: +3
 *  - トークン完全一致（作業テキストを区切ったトークンが事例本文に含まれる）: +1
 * スコア0の事例は除外。同点は「新しい順→重い順」で並べる（現場に効く最新・重大例を上へ）。
 */
export function findSimilarAccidentCasesForKy(
  workText: string | null | undefined,
  cases: readonly AccidentCase[],
  opts: { limit?: number } = {}
): SimilarAccidentHit[] {
  const limit = opts.limit ?? 4;
  const text = typeof workText === "string" ? workText.trim() : "";
  if (text.length < 2) return [];

  // 作業テキストに含まれる作業語と、それが示す事故の型を先に確定する。
  const presentTerms = Object.keys(WORK_TERM_TO_TYPES).filter((term) => text.includes(term));
  const resonantTypes = new Set<AccidentType>();
  for (const term of presentTerms) {
    for (const t of WORK_TERM_TO_TYPES[term]) resonantTypes.add(t);
  }
  const tokens = tokenize(text);

  const hits: SimilarAccidentHit[] = [];
  for (const c of cases) {
    const haystack = `${c.title}\n${c.summary}\n${(c.mainCauses ?? []).join("\n")}`;
    let score = 0;
    const reasons: string[] = [];

    for (const term of presentTerms) {
      if (haystack.includes(term)) {
        score += 2;
        reasons.push(`作業語「${term}」`);
      }
    }
    if (resonantTypes.has(c.type)) {
      score += 3;
      reasons.push(`${c.type}の類似`);
    }
    for (const tok of tokens) {
      // 作業語で既に加点した語はトークン側で二重計上しない。
      if (presentTerms.includes(tok)) continue;
      if (haystack.includes(tok)) score += 1;
    }

    if (score > 0) hits.push({ case: c, score, reasons });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const rk = recencyKey(b.case.occurredOn) - recencyKey(a.case.occurredOn);
    if (rk !== 0) return rk;
    return severityToKyScale(b.case.severity) - severityToKyScale(a.case.severity);
  });
  return hits.slice(0, limit);
}

export interface KyRiskDraftFromAccident {
  hazard: string;
  reduction: string;
  likelihood: KyLikertScale;
  severity: KyLikertScale;
}

/**
 * 類似事例 → KY危険行の下書き（「危険のポイントへ取り込む」で使う）。
 * hazard は事故の型と事例タイトルから、reduction は事例の防止ポイント先頭から作る。
 * 発生可能性は不明のため中位(2)固定、重大性は事例の severity から写す。
 */
export function accidentCaseToRiskDraft(c: AccidentCase): KyRiskDraftFromAccident {
  const hazardBase = c.title?.trim() || c.summary?.trim() || c.type;
  const reduction = (c.preventionPoints ?? []).find((p) => p.trim()) ?? "";
  return {
    hazard: `${c.type}（類似災害: ${hazardBase}）`,
    reduction,
    likelihood: 2 as KyLikertScale,
    severity: severityToKyScale(c.severity),
  };
}
