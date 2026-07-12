/**
 * カリキュラム網羅ゲートの常設CIテスト（企画 02章 層3・EDU-D2）。
 *
 * 1. curriculum_id を宣言した全デッキで違反0（法定項目が1つでも未カバーなら赤）。
 * 2. fidelity.test.ts と同作法の「裏切り実証」— 実データの covers を1項目外すと
 *    scope-uncovered が必ず出る（これが落ちなくなったらゲートの故障）。
 */
import { describe, expect, it } from "vitest";
import { checkCurriculumCoverage, type CoverageViolation } from "@/lib/education-curriculum/coverage";
import { getCurriculum } from "@/data/education-curriculum";
import { EDUCATION_DECKS, getDeck } from "@/data/education-decks";
import type { EduDeck } from "@/data/education-decks";

function kinds(vs: CoverageViolation[]): string[] {
  return vs.map((v) => v.kind);
}

describe("網羅ゲート: 宣言デッキ全件で違反0", () => {
  it("登録デッキが1件以上ある", () => {
    expect(EDUCATION_DECKS.length).toBeGreaterThan(0);
  });

  for (const deck of EDUCATION_DECKS) {
    it(`${deck.slug}: 網羅ゲート緑（法定項目・時間・実技宣言・根拠表示すべて充足）`, () => {
      const curriculum = getCurriculum(deck.curriculumId);
      expect(curriculum, `${deck.slug} の正本 ${deck.curriculumId} が無い`).toBeDefined();
      const violations = checkCurriculumCoverage(curriculum!, deck.trackId, deck);
      expect(
        violations,
        `${deck.slug} の違反 ${violations.length}件:\n${violations.map((v) => `[${v.kind}] ${v.message}`).join("\n")}`,
      ).toEqual([]);
    });
  }
});

describe("裏切り検出の実証（これが落ちなくなったらゲートの故障）", () => {
  const fh = getDeck("fullharness")!;
  const fhCurriculum = getCurriculum("se-36-41-fullharness")!;

  function drop(deck: EduDeck, slideId: string, coverRef: string): EduDeck {
    return {
      ...deck,
      slides: deck.slides.map((s) =>
        s.id === slideId ? { ...s, covers: s.covers.filter((c) => c !== coverRef) } : s,
      ),
    };
  }

  it("法定項目の covers を1つ外すと scope-uncovered が必ず出る", () => {
    // 器具の知識の scope-2（フルハーネスの装着の方法）を担当するスライドから covers を除去
    const tampered = drop(fh, "gakka-2a", "fh-gakka-2/s2");
    const v = checkCurriculumCoverage(fhCurriculum, "default", tampered);
    expect(kinds(v)).toContain("scope-uncovered");
    expect(v.some((x) => x.message.includes("fh-gakka-2/s2"))).toBe(true);
  });

  it("科目全体参照（unitId）を外すとその科目の全 scope が未カバーになる", () => {
    const tampered = drop(fh, "gakka-1", "fh-gakka-1");
    const v = checkCurriculumCoverage(fhCurriculum, "default", tampered);
    // fh-gakka-1 は3項目 → 3件の scope-uncovered
    const uncovered = v.filter((x) => x.kind === "scope-uncovered");
    expect(uncovered.length).toBeGreaterThanOrEqual(3);
  });

  it("実技の非代替宣言スライドを外すと jitsugi-notice-missing", () => {
    const noNotice: EduDeck = { ...fh, slides: fh.slides.filter((s) => s.kind !== "jitsugi-notice") };
    expect(kinds(checkCurriculumCoverage(fhCurriculum, "default", noNotice))).toContain(
      "jitsugi-notice-missing",
    );
  });

  it("timetable の配分を法定未満にすると hours-shortfall", () => {
    const short: EduDeck = {
      ...fh,
      timetable: fh.timetable.map((t) => (t.unitId === "fh-gakka-2" ? { ...t, minutes: 30 } : t)),
    };
    expect(kinds(checkCurriculumCoverage(fhCurriculum, "default", short))).toContain("hours-shortfall");
  });

  it("正本に無い covers を参照すると unknown-ref", () => {
    const ghost: EduDeck = {
      ...fh,
      slides: fh.slides.map((s) => (s.id === "gakka-4" ? { ...s, covers: ["fh-gakka-9/s1"] } : s)),
    };
    expect(kinds(checkCurriculumCoverage(fhCurriculum, "default", ghost))).toContain("unknown-ref");
  });

  it("表紙の根拠表示（則条番号）を落とすと basis-display-missing", () => {
    const noBasis: EduDeck = { ...fh, basisDisplay: "学科4.5時間＋実技1.5時間" };
    expect(kinds(checkCurriculumCoverage(fhCurriculum, "default", noBasis))).toContain(
      "basis-display-missing",
    );
  });

  it("存在しないトラックを宣言すると unknown-track", () => {
    const badTrack: EduDeck = { ...fh, trackId: "nonexistent" };
    expect(kinds(checkCurriculumCoverage(fhCurriculum, "nonexistent", badTrack))).toContain(
      "unknown-track",
    );
  });
});
