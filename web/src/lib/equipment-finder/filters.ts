import equipmentDb from "@/data/safety-equipment-db.json";
import type { EquipmentCategory } from "@/config/equipment-categories";

export type EquipmentItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  name: string;
  maker: string;
  subCategory?: string;
  spec?: string;
  priceMin?: number;
  priceMax?: number;
  priceLabel?: string;
  industries?: string[];
  hazards?: string[];
  seasons?: string[];
  rating?: number;
  reviewCount?: number;
  recommendReason?: string;
  regulations?: string[];
  affiliate?: {
    amazonUrl?: string;
    rakutenUrl?: string;
  };
};

const ITEMS = (equipmentDb as { items: EquipmentItem[] }).items;

/** カテゴリで絞り込んだ全アイテムを取得 */
export function getItemsByCategory(category: EquipmentCategory): EquipmentItem[] {
  return ITEMS.filter((it) => {
    if (!category.dbCategoryIds.includes(it.categoryId)) return false;
    if (category.subCategoryIncludes && category.subCategoryIncludes.length > 0) {
      const sub = it.subCategory ?? "";
      const hit = category.subCategoryIncludes.some((s) => sub.includes(s));
      if (!hit) return false;
    }
    if (category.subCategoryExcludes && category.subCategoryExcludes.length > 0) {
      const sub = it.subCategory ?? "";
      const hit = category.subCategoryExcludes.some((s) => sub.includes(s));
      if (hit) return false;
    }
    return true;
  });
}

/** 予算ID（low/mid/high）から上限価格を返す */
export function budgetCap(value: string): number | undefined {
  if (value === "low") return 20000;
  if (value === "mid") return 50000;
  if (value === "high") return 500000;
  return undefined;
}
