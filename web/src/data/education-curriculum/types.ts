/**
 * カリキュラム正本レジストリの型（企画 docs/edu-pack-plan-2026-07-12/02-curriculum-gate.md §2 層1）。
 *
 * 目的: 特別教育規程・ガイドライン告示の「科目・範囲・時間」を正本表記のまま構造化し、
 * スライド→法定項目の対応（covers）を機械照合する土台にする。plain の fidelity ゲートと
 * 同思想 — 人の宣言ではなく、正本スナップショットとの機械照合で CI を落とす。
 *
 * scopeItems（範囲欄の項目）が照合の最小単位。1項目でも対応スライド0枚なら網羅ゲートが赤。
 * 時間は全て下限（「〜時間以上」）。通達・ガイドラインベース（熱中症等）は educationClass="circular"。
 */

export type CurriculumUnitKind = "gakka" | "jitsugi"; // 学科 / 実技

/** 学科・実技の1科目（告示の1行）。scopeItems は範囲欄を項目分割したもの。 */
export type CurriculumUnit = {
  /** 例 "fullharness-gakka-1"。covers 参照のキー。 */
  unitId: string;
  kind: CurriculumUnitKind;
  /** 告示の科目名を正本表記のまま。 */
  subject: string;
  /** 告示「範囲」欄の項目を分割収載（照合の最小単位）。 */
  scopeItems: string[];
  /** 法定時間（時間単位・0.5刻み）。通達ベースで時間規定が無い作業従事者等は 0。 */
  minHours: number;
};

/**
 * 対象別コース（トラック）。単一対象の教育（フルハーネス・粉じん・低圧電気）は tracks 1件。
 * 熱中症の3階建て（管理者/職長/作業従事者）や酸欠の第1種/第2種のように、同一根拠で対象別に
 * 科目・時間が分かれる教育は複数トラックで表す。デッキは trackId を宣言して1トラックを照合対象にする。
 */
export type CurriculumTrack = {
  /** 例 "manager" / "type-1"。curriculumId 内で一意。 */
  trackId: string;
  /** 表示名（例「管理者教育」「第1種」）。 */
  name: string;
  units: CurriculumUnit[];
  /** units の学科合計（時間）。既知の法定合計とスナップショットテストで突合。 */
  totalGakkaHours: number;
  /** units の実技合計（時間）。実技なし教育（粉じん・酸欠等）は null。 */
  totalJitsugiHours: number | null;
};

/** 安衛則36条系（法定時間あり）か、通達・ガイドライン系（法定時間なし＝科目網羅のみ照合）か。 */
export type EducationClass = "special" | "circular";

export type CurriculumBasis = {
  /** 例「安衛則第36条第41号」。デッキ表紙の根拠表記（basis-display-missing）と突合。 */
  ruleRef: string;
  /** 告示名・番号・改正履歴（正本表記）。 */
  kokuji: string;
  /** e-Gov 法令IDが存在する告示のみ。 */
  egovLawId?: string;
  /** 正本の出典URL（e-Gov／MHLW法令等DB／JAISH）。 */
  sourceUrl: string;
  /** 正本確認日（手動転記のピン留め根拠）。 */
  retrievedOn: string;
};

export type EducationCurriculum = {
  /** 例 "se-36-41-fullharness"（education-rules のID体系に整合）。 */
  curriculumId: string;
  name: string;
  basis: CurriculumBasis;
  educationClass: EducationClass;
  tracks: CurriculumTrack[];
};

/** curriculumId + trackId で1トラックを取り出す。 */
export function findTrack(
  curriculum: EducationCurriculum,
  trackId: string,
): CurriculumTrack | undefined {
  return curriculum.tracks.find((t) => t.trackId === trackId);
}

/** scopeItem の照合キー（例 "fullharness-gakka-1/s2"）。1始まりの番号。 */
export function scopeKey(unitId: string, scopeIndex1: number): string {
  return `${unitId}/s${scopeIndex1}`;
}

/** トラックの全 scopeItem キーを列挙（範囲項目＝照合の最小単位）。 */
export function allScopeKeys(track: CurriculumTrack): string[] {
  const keys: string[] = [];
  for (const u of track.units) {
    u.scopeItems.forEach((_, i) => keys.push(scopeKey(u.unitId, i + 1)));
  }
  return keys;
}
