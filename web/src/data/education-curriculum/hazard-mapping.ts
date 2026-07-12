/**
 * 教育種別 → 災害の型マッピング（企画 04章§2）。
 *
 * hazard-slides は「災害の型」（21分類）軸、教育は「業務」軸なので変換辞書を1つ持つ。
 * 値は type-normalization.ts の HazardTypeSlug union を使うため、未知キーはコンパイル時に検出される。
 * デッキの統計・事例スライドはこの辞書経由で build-summary の kpi/topCauses/featuredCases を引く。
 *
 * 初期ラインナップ5教育分（フルハーネス・熱中症・粉じん・低圧電気・酸欠）を収載済み。
 */

import type { HazardTypeSlug } from "@/lib/accidents/type-normalization";

export const CURRICULUM_HAZARD_MAP: Readonly<Record<string, readonly HazardTypeSlug[]>> = {
  "se-36-41-fullharness": ["fall"], // 墜落・転落
  "circular-necchu": ["hot-cold-contact"], // 高温・低温の物との接触
  "se-36-4-teiatsu": ["electric-shock"], // 感電
  "se-36-29-dust": ["harmful-substance"], // 粉じん＝有害物等との接触（じん肺）
  "se-36-26-oxygen": ["harmful-substance"], // 酸欠・硫化水素中毒＝有害物等との接触
};

export function hazardSlugsFor(curriculumId: string): readonly HazardTypeSlug[] {
  return CURRICULUM_HAZARD_MAP[curriculumId] ?? [];
}
