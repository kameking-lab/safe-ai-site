import type { EquipmentCategory, RefineAnswers } from "@/config/equipment-categories";
import { budgetCap, getItemsByCategory, type EquipmentItem } from "./filters";

export type ScoredItem = EquipmentItem & {
  score: number;
  matchedAnswers: string[];
};

/**
 * スコアリングルール（仕様書）:
 * - フィルタ完全一致: +30点
 * - フィルタ部分一致: +15点
 * - レビュー高評価（rating ≥ 4.5）: +10点
 * - 価格帯マッチ: +15点
 */
export function recommendItems(
  category: EquipmentCategory,
  answers: RefineAnswers,
  limit = 12
): ScoredItem[] {
  const items = getItemsByCategory(category);
  const scored: ScoredItem[] = items.map((item) => {
    let score = 0;
    const matched: string[] = [];

    for (const q of category.refineQuestions) {
      const ans = answers[q.id];
      if (!ans || ans === "any") continue;

      // 予算質問は別ロジック
      if (q.id === "budget") {
        const cap = budgetCap(ans);
        if (cap !== undefined && item.priceMin !== undefined) {
          if (item.priceMin <= cap) {
            score += 15;
            matched.push(`予算: ${ans}`);
          }
        }
        continue;
      }

      // 業種質問（useCase で industries 照合する場合がある）
      const industryMap: Record<string, string> = {
        construction: "construction",
        manufacturing: "manufacturing",
        forestry: "forestry",
        建設: "construction",
        製造: "manufacturing",
        林業: "forestry",
      };
      if (q.id === "useCase" && industryMap[ans]) {
        if (item.industries?.includes(industryMap[ans])) {
          score += 30;
          matched.push(`業種: ${ans}`);
          continue;
        }
      }

      // 文字列マッチ（subCategory・spec・name に含まれるかで判定）
      const haystack = [item.subCategory, item.spec, item.name, item.recommendReason]
        .filter(Boolean)
        .join(" ");
      if (haystack.includes(ans)) {
        score += 30;
        matched.push(`${q.label}: ${ans}`);
      } else {
        // 部分一致: 半角/全角や同義語の簡易対応
        const normalized = ans.replace(/[（）()・/\-\s]/g, "");
        const normalizedHay = haystack.replace(/[（）()・/\-\s]/g, "");
        if (normalized && normalizedHay.includes(normalized)) {
          score += 15;
          matched.push(`${q.label}: ${ans}（部分一致）`);
        }
      }
    }

    // レビュー高評価
    if ((item.rating ?? 0) >= 4.5) {
      score += 10;
    }

    return { ...item, score, matchedAnswers: matched };
  });

  // スコア降順 → レビュー数降順 でソート
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });

  return scored.slice(0, limit);
}
