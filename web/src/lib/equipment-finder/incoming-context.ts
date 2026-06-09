// 化学物質RA / 事故DB → 保護具AIファインダーの受信コンテキスト解決ロジック。
//
// 連携元（chemical-ra / accident）が渡す推奨カテゴリID配列を、実在する
// equipment-categories へ解決し、自動遷移先と初期回答（防毒マスクの吸収缶種別）を
// 決める純関数群。UI（equipment-finder-client）から切り出してテスト可能にする。

import { getCategoryById, type EquipmentCategory, type RefineAnswers } from "@/config/equipment-categories";

/** 防毒マスクの吸収缶種別ヒント（chemical-equipment-mapping の gasMaskAbsorber と一致） */
export type GasMaskAbsorber = "有機ガス" | "ハロゲン" | "硫化水素" | "アンモニア";

/**
 * 推奨カテゴリID配列を実在カテゴリへ解決する。
 * - 存在しないIDは除外（捏造したカテゴリを出さない）
 * - 元の優先順位を維持
 * - 重複IDは最初の1件のみ
 */
export function resolveRecommendedCategories(ids: string[]): EquipmentCategory[] {
  const seen = new Set<string>();
  const out: EquipmentCategory[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const category = getCategoryById(id);
    if (category) {
      out.push(category);
      seen.add(id);
    }
  }
  return out;
}

/**
 * 自動遷移先となる最初の有効カテゴリID。有効なカテゴリが1つも無ければ null。
 */
export function firstValidCategoryId(ids: string[]): string | null {
  const resolved = resolveRecommendedCategories(ids);
  return resolved.length > 0 ? resolved[0].id : null;
}

/**
 * カテゴリ遷移時の初期回答。防毒マスクで化学物質由来の吸収缶種別が分かっている場合のみ
 * gasType を初期選択する（他カテゴリ・吸収缶不明時は空＝ユーザーが選ぶ）。
 */
export function initialAnswersForCategory(
  catId: string,
  absorber?: GasMaskAbsorber
): RefineAnswers {
  if (catId === "gas-mask" && absorber) {
    return { gasType: absorber };
  }
  return {};
}
