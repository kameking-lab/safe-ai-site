/**
 * カリキュラム正本レジストリの公開エントリ（企画 02章 層1）。
 * ページ表示・PPTX・網羅ゲートはこのレジストリを単一正本として参照する。
 */

export * from "./types";
export * from "./disclaimers";
export { CURRICULUM_HAZARD_MAP, hazardSlugsFor } from "./hazard-mapping";
export { EDUCATION_CURRICULA } from "./registry";

import type { EducationCurriculum, CurriculumTrack } from "./types";
import { EDUCATION_CURRICULA } from "./registry";

const BY_ID = new Map(EDUCATION_CURRICULA.map((c) => [c.curriculumId, c]));

export function getCurriculum(curriculumId: string): EducationCurriculum | undefined {
  return BY_ID.get(curriculumId);
}

/** トラックの学科合計時間を units から機械導出（既知の法定合計と突合するため）。 */
export function deriveGakkaHours(track: CurriculumTrack): number {
  return track.units
    .filter((u) => u.kind === "gakka")
    .reduce((sum, u) => sum + u.minHours, 0);
}

/** トラックの実技合計時間を units から機械導出（実技なしは 0）。 */
export function deriveJitsugiHours(track: CurriculumTrack): number {
  return track.units
    .filter((u) => u.kind === "jitsugi")
    .reduce((sum, u) => sum + u.minHours, 0);
}
