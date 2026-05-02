import { harnessCategory } from "./harness";
import { gasMaskCategory } from "./gas-mask";
import { dustMaskCategory } from "./dust-mask";
import { helmetCategory } from "./helmet";
import { safetyShoesCategory } from "./safety-shoes";
import { gogglesCategory } from "./goggles";
import { earProtectionCategory } from "./ear-protection";
import { glovesCategory } from "./gloves";
import { protectiveClothingCategory } from "./protective-clothing";
import { lifeSavingCategory } from "./life-saving";
import { visibilityCategory } from "./visibility";
import { otherCategory } from "./other";
import type { EquipmentCategory } from "./types";

/** 12種類の保護具カテゴリ。順序はカード表示順 */
export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  harnessCategory,
  gasMaskCategory,
  dustMaskCategory,
  helmetCategory,
  safetyShoesCategory,
  gogglesCategory,
  earProtectionCategory,
  glovesCategory,
  protectiveClothingCategory,
  lifeSavingCategory,
  visibilityCategory,
  otherCategory,
];

export function getCategoryById(id: string): EquipmentCategory | undefined {
  return EQUIPMENT_CATEGORIES.find((c) => c.id === id);
}

export type { EquipmentCategory, RefineAnswers, RefineQuestion, RefineOption } from "./types";
