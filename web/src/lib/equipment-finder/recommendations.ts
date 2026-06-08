import type { EquipmentCategory, RefineAnswers } from "@/config/equipment-categories";
import { budgetCap, getItemsByCategory, type EquipmentItem } from "./filters";

export type ScoredItem = EquipmentItem & {
  score: number;
  matchedAnswers: string[];
};

/**
 * 「ハーネス形状（X型/Y型/H型）」はフルハーネス固有の属性で、ランヤードや胴ベルトには
 * 形状という概念が無い。形状を指定した検索（shape ≠ any）では、形状を持たない製品が
 * 「ランヤード種別＋業種＋高評価」の合算で同点上位化し、X型ハーネスを探したのに
 * ランヤードが1位に出る不具合があった。形状指定時は製品クラスを優先ソートキーにし、
 * 形状を持つフルハーネスを上位（tier 0）、形状概念の無いランヤード等を下位（tier 1）へ降格する。
 */
const SHAPE_QUESTION_ID = "shape";
const HARNESS_SUBCATEGORY_MARKER = "ハーネス";

/** 形状質問に「問わない」以外が選択されているか（＝フルハーネス固有属性での検索か）。 */
export function isShapeSelected(
  category: EquipmentCategory,
  answers: RefineAnswers
): boolean {
  const hasShapeQuestion = category.refineQuestions.some(
    (q) => q.id === SHAPE_QUESTION_ID
  );
  if (!hasShapeQuestion) return false;
  const ans = answers[SHAPE_QUESTION_ID];
  return !!ans && ans !== "any";
}

/**
 * 製品クラスの優先ティアを返す（小さいほど上位）。
 * 形状未指定なら全件 tier 0（従来挙動）。形状指定時のみ、フルハーネス=0／非ハーネス=1。
 */
export function classTier(item: EquipmentItem, shapeSelected: boolean): number {
  if (!shapeSelected) return 0;
  return (item.subCategory ?? "").includes(HARNESS_SUBCATEGORY_MARKER) ? 0 : 1;
}

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
  const shapeSelected = isShapeSelected(category, answers);
  const scored: Array<{ item: ScoredItem; tier: number }> = items.map((item) => {
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

    return {
      item: { ...item, score, matchedAnswers: matched },
      tier: classTier(item, shapeSelected),
    };
  });

  // クラス優先（形状指定時のみ有効）→ スコア降順 → レビュー数降順 でソート
  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (b.item.score !== a.item.score) return b.item.score - a.item.score;
    return (b.item.reviewCount ?? 0) - (a.item.reviewCount ?? 0);
  });

  return scored.slice(0, limit).map((s) => s.item);
}
