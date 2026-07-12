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
import { soilVolumeConversionCalculator } from "./calculators/soil-volume-conversion";
import { craneRatedLoadCalculator } from "./calculators/crane-rated-load";
import { formworkShoringCheckCalculator } from "./calculators/formwork-shoring-check";
import { cableAmpacityCalculator } from "./calculators/cable-ampacity";
import { windLoadTemporaryCalculator } from "./calculators/wind-load-temporary";
import { earthPressureShoringCalculator } from "./calculators/earth-pressure-shoring";
import { anchorPulloutCalculator } from "./calculators/anchor-pullout";
import { scaffoldLoadSummaryCalculator } from "./calculators/scaffold-load-summary";
import { protectiveCanopyCheckCalculator } from "./calculators/protective-canopy-check";
import { suspendedScaffoldCheckCalculator } from "./calculators/suspended-scaffold-check";
import { ladderStepladderCheckCalculator } from "./calculators/ladder-stepladder-check";
import { workPlatformOpeningCheckCalculator } from "./calculators/work-platform-opening-check";
import { waterPressureCalculator } from "./calculators/water-pressure";
import { formworkLateralPressureCalculator } from "./calculators/formwork-lateral-pressure";
import { shoringMemberCheckCalculator } from "./calculators/shoring-member-check";
import { rebarMassCalculator } from "./calculators/rebar-mass";
import { concreteVolumeCalculator } from "./calculators/concrete-volume";

export const CONSTRUCTION_CALCULATORS: ConstructionCalculator[] = [
  slingWireLoadCalculator,
  scaffoldTankanCheckCalculator,
  excavationSlopeCalculator,
  soilVolumeConversionCalculator,
  craneRatedLoadCalculator,
  formworkShoringCheckCalculator,
  cableAmpacityCalculator,
  windLoadTemporaryCalculator,
  earthPressureShoringCalculator,
  anchorPulloutCalculator,
  scaffoldLoadSummaryCalculator,
  protectiveCanopyCheckCalculator,
  suspendedScaffoldCheckCalculator,
  ladderStepladderCheckCalculator,
  workPlatformOpeningCheckCalculator,
  waterPressureCalculator,
  formworkLateralPressureCalculator,
  shoringMemberCheckCalculator,
  rebarMassCalculator,
  concreteVolumeCalculator,
];

const BY_SLUG: ReadonlyMap<string, ConstructionCalculator> = new Map(
  CONSTRUCTION_CALCULATORS.map((c) => [c.slug, c]),
);

export function getCalculator(slug: string): ConstructionCalculator | undefined {
  return BY_SLUG.get(slug);
}
