/**
 * 建設計算コーナー 計算機レジストリ
 *
 * 新しい計算機の追加手順（量産テンプレ・BACKLOG-construction-calc.md 参照）:
 *   1. calculators/<slug>.ts に ConstructionCalculator を宣言的に定義
 *   2. ここに import して CONSTRUCTION_CALCULATORS へ追加
 *   3. <slug>.test.ts で境界値含むテストケースを数値固定
 *   4. /construction-calc ハブ・[slug] ページ・AI入口は自動で反映される
 */

import type { ConstructionCalculator } from "./schema";
import { slingWireLoadCalculator } from "./calculators/sling-wire-load";
import { excavationSlopeCalculator } from "./calculators/excavation-slope";
import { scaffoldTankanCheckCalculator } from "./calculators/scaffold-tankan-check";

export const CONSTRUCTION_CALCULATORS: ConstructionCalculator[] = [
  slingWireLoadCalculator,
  scaffoldTankanCheckCalculator,
  excavationSlopeCalculator,
];

const BY_SLUG: ReadonlyMap<string, ConstructionCalculator> = new Map(
  CONSTRUCTION_CALCULATORS.map((c) => [c.slug, c]),
);

export function getCalculator(slug: string): ConstructionCalculator | undefined {
  return BY_SLUG.get(slug);
}
