/**
 * 教育種別 → 災害の型マッピング（企画 04章§2）。
 *
 * hazard-slides は「災害の型」（21分類）軸、教育は「業務」軸なので変換辞書を1つ持つ。
 * 値は type-normalization.ts の HazardTypeSlug union を使うため、未知キーはコンパイル時に検出される。
 * デッキの統計・事例スライドはこの辞書経由で build-summary の kpi/topCauses/featuredCases を引く。
 *
 * 網羅（全5教育分）は EDU-D3（Sonnet）で完成。ここでは第1波デッキ（フルハーネス・熱中症）が
 * 必要とする分と、正本レジストリに揃っている分を確定分として置く。
 */

import type { HazardTypeSlug } from "@/lib/accidents/type-normalization";

export const CURRICULUM_HAZARD_MAP: Readonly<Record<string, readonly HazardTypeSlug[]>> = {
  "se-36-41-fullharness": ["fall"], // 墜落・転落
  "circular-necchu": ["hot-cold-contact"], // 高温・低温の物との接触
  "se-36-4-teiatsu": ["electric-shock"], // 感電
  "se-36-29-dust": ["harmful-substance"], // 粉じん＝有害物等との接触（じん肺）
};

export function hazardSlugsFor(curriculumId: string): readonly HazardTypeSlug[] {
  return CURRICULUM_HAZARD_MAP[curriculumId] ?? [];
}
