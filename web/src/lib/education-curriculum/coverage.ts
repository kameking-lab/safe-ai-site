/**
 * カリキュラム網羅ゲート（企画 02章 層3）。
 *
 * plain の fidelity ゲートと同じ純関数＋常設テストの2段構え。
 * checkCurriculumCoverage(curriculum, trackId, deck) が違反配列を返し、
 * curriculum-coverage.test.ts が「宣言デッキ全件で違反0」を CI で要求する。
 * 「法定項目が1つでも未カバーなら CI が赤」を宣伝でなく機械保証にするのが目的。
 */

import type { EducationCurriculum, CurriculumTrack } from "@/data/education-curriculum/types";
import { findTrack, scopeKey } from "@/data/education-curriculum/types";
import type { EduDeck } from "@/data/education-decks/types";

/**
 * 網羅（scope-uncovered）の照合対象は「学科科目」の範囲項目のみ（企画 02章§1）。
 * 実技科目はスライドで代替不能なので scope 照合の対象にせず、jitsugi-notice-missing で
 * 「非代替宣言スライドの存在」だけを機械検証する。
 */
function gakkaScopeKeys(track: CurriculumTrack): string[] {
  const keys: string[] = [];
  for (const u of track.units) {
    if (u.kind !== "gakka") continue;
    u.scopeItems.forEach((_, i) => keys.push(scopeKey(u.unitId, i + 1)));
  }
  return keys;
}

export type CoverageViolationKind =
  | "scope-uncovered" // 範囲項目にスライド0枚（主目的。1件でCI赤）
  | "hours-shortfall" // timetable 科目合計 < 法定時間
  | "jitsugi-notice-missing" // 実技科目があるのに非代替宣言スライドなし
  | "unknown-ref" // covers が正本に存在しない項目を参照（幽霊参照）
  | "unknown-track" // デッキの trackId が正本に存在しない
  | "basis-display-missing"; // 表紙に根拠表記なし

export type CoverageViolation = {
  kind: CoverageViolationKind;
  /** 人が直せる具体メッセージ（欠落キーをそのまま含める）。 */
  message: string;
};

/**
 * covers 参照を scopeKey 集合に展開する。
 * - "unitId/sN" はその scope 項目のみ
 * - "unitId"（科目全体）はその科目の全 scope 項目に展開
 * unknownRefs には正本に存在しない参照を積む。
 */
function expandCovers(
  track: CurriculumTrack,
  covers: string[],
): { covered: Set<string>; unknownRefs: string[] } {
  const covered = new Set<string>();
  const unknownRefs: string[] = [];
  const unitById = new Map(track.units.map((u) => [u.unitId, u]));

  for (const ref of covers) {
    const slash = ref.indexOf("/");
    if (slash === -1) {
      // 科目全体参照
      const unit = unitById.get(ref);
      if (!unit) {
        unknownRefs.push(ref);
        continue;
      }
      unit.scopeItems.forEach((_, i) => covered.add(`${ref}/s${i + 1}`));
    } else {
      const unitId = ref.slice(0, slash);
      const unit = unitById.get(unitId);
      if (!unit) {
        unknownRefs.push(ref);
        continue;
      }
      // "/sN" の N が範囲項目数以内か
      const m = /^s(\d+)$/.exec(ref.slice(slash + 1));
      const n = m ? Number(m[1]) : NaN;
      if (!m || n < 1 || n > unit.scopeItems.length) {
        unknownRefs.push(ref);
        continue;
      }
      covered.add(`${unitId}/s${n}`);
    }
  }
  return { covered, unknownRefs };
}

/** 法定対応表の1行（科目×範囲×時間×対応スライド番号）。curriculum:status / 配布物で使う。 */
export type CoverageReportRow = {
  unitId: string;
  kind: "gakka" | "jitsugi";
  subject: string;
  scopeItem: string;
  minHours: number;
  /** この scope をカバーするスライド番号（1始まり）。実技は「対面実施」を示す。 */
  slideNumbers: number[];
};

/**
 * デッキの法定対応表を生成する（科目×範囲×時間×対応スライド番号）。
 * 学科は covers からスライド番号を解決、実技は非代替（対面実施）として番号なし。
 */
export function buildCoverageReport(
  curriculum: EducationCurriculum,
  trackId: string,
  deck: EduDeck,
): CoverageReportRow[] {
  const track = findTrack(curriculum, trackId);
  if (!track) return [];
  // scopeKey -> スライド番号（1始まり）
  const coveredBy = new Map<string, number[]>();
  deck.slides.forEach((slide, idx) => {
    const { covered } = expandCovers(track, slide.covers);
    for (const key of covered) {
      const arr = coveredBy.get(key) ?? [];
      arr.push(idx + 1);
      coveredBy.set(key, arr);
    }
  });
  const rows: CoverageReportRow[] = [];
  for (const unit of track.units) {
    unit.scopeItems.forEach((scopeItem, i) => {
      const key = `${unit.unitId}/s${i + 1}`;
      rows.push({
        unitId: unit.unitId,
        kind: unit.kind,
        subject: unit.subject,
        scopeItem,
        minHours: unit.minHours,
        slideNumbers: unit.kind === "gakka" ? (coveredBy.get(key) ?? []) : [],
      });
    });
  }
  return rows;
}

export function checkCurriculumCoverage(
  curriculum: EducationCurriculum,
  trackId: string,
  deck: EduDeck,
): CoverageViolation[] {
  const violations: CoverageViolation[] = [];
  const track = findTrack(curriculum, trackId);
  if (!track) {
    return [
      {
        kind: "unknown-track",
        message: `デッキ ${deck.slug} が正本 ${curriculum.curriculumId} に存在しないトラック "${trackId}" を宣言`,
      },
    ];
  }

  // --- covers の展開 & 幽霊参照 ---
  const allCovered = new Set<string>();
  for (const slide of deck.slides) {
    const { covered, unknownRefs } = expandCovers(track, slide.covers);
    covered.forEach((k) => allCovered.add(k));
    for (const ref of unknownRefs) {
      violations.push({
        kind: "unknown-ref",
        message: `スライド ${slide.id} の covers "${ref}" が正本トラック ${curriculum.curriculumId}/${trackId} に存在しない`,
      });
    }
  }

  // --- scope-uncovered（主目的）: 学科の全範囲項目にスライド1枚以上 ---
  for (const key of gakkaScopeKeys(track)) {
    if (!allCovered.has(key)) {
      const [unitId, sN] = key.split("/");
      const unit = track.units.find((u) => u.unitId === unitId);
      const idx = Number(sN.replace("s", "")) - 1;
      const scopeText = unit?.scopeItems[idx] ?? "";
      violations.push({
        kind: "scope-uncovered",
        message: `法定項目 ${key}（${unit?.subject ?? unitId}／${scopeText}）に対応するスライドが1枚も無い`,
      });
    }
  }

  // --- hours-shortfall: 科目別 timetable 配分が法定時間（分）以上か ---
  const minutesByUnit = new Map<string, number>();
  for (const t of deck.timetable) {
    minutesByUnit.set(t.unitId, (minutesByUnit.get(t.unitId) ?? 0) + t.minutes);
  }
  for (const unit of track.units) {
    if (unit.minHours <= 0) continue; // 通達ベースの作業従事者等（時間規定なし）は照合しない
    const got = minutesByUnit.get(unit.unitId) ?? 0;
    const need = unit.minHours * 60;
    if (got < need) {
      violations.push({
        kind: "hours-shortfall",
        message: `科目 ${unit.unitId}（${unit.subject}）の配分 ${got}分 < 法定 ${need}分（${unit.minHours}時間以上）`,
      });
    }
  }

  // --- jitsugi-notice-missing: 実技科目があるのに非代替宣言スライドなし ---
  const hasJitsugi = track.units.some((u) => u.kind === "jitsugi");
  if (hasJitsugi) {
    const hasNotice = deck.slides.some((s) => s.kind === "jitsugi-notice");
    if (!hasNotice) {
      violations.push({
        kind: "jitsugi-notice-missing",
        message: `実技科目を含む教育だが、実技の非代替宣言スライド（kind:"jitsugi-notice"）がデッキ ${deck.slug} に無い`,
      });
    }
  }

  // --- basis-display-missing: 表紙の根拠表記が正本の則条を含むか ---
  if (!deck.basisDisplay || !deck.basisDisplay.includes(curriculum.basis.ruleRef)) {
    violations.push({
      kind: "basis-display-missing",
      message: `デッキ ${deck.slug} の basisDisplay に根拠 "${curriculum.basis.ruleRef}" が表示されていない`,
    });
  }
  const hasCover = deck.slides.some((s) => s.kind === "cover");
  if (!hasCover) {
    violations.push({
      kind: "basis-display-missing",
      message: `デッキ ${deck.slug} に表紙スライド（kind:"cover"）が無い`,
    });
  }

  return violations;
}
