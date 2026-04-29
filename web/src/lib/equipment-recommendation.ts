// 保護具AIファインダー: 4軸スコアリング推薦ロジック
//
// 業種30 + 危険源30 + 季節15 + 予算15 + 評価ボーナス10 = 100点満点
// 上位5商品を「推薦」、次点10商品を「他のおすすめ」として返す。

import equipmentDb from "@/data/safety-equipment-db.json";

export type EquipmentItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  name: string;
  maker?: string;
  subCategory?: string;
  spec: string;
  priceMin: number;
  priceMax: number;
  priceLabel: string;
  industries: string[];
  hazards: string[];
  seasons: string[];
  rating?: number;
  reviewCount?: number;
  recommendReason?: string;
  regulations?: string[];
  affiliate: { amazonUrl: string; rakutenUrl: string; moshimoNote: string };
  jisOrCertification: string;
};

export type RecommendInput = {
  /** "construction" | "manufacturing" | ... */
  industry?: string;
  /** "fall" | "dust" | ... */
  hazard?: string;
  /** "all" | "summer" | "winter" */
  season?: string;
  /** budget cap (JPY). undefined = unlimited */
  budgetCap?: number;
};

export type ScoredEquipment = EquipmentItem & {
  score: number;
  scoreBreakdown: {
    industry: number;
    hazard: number;
    season: number;
    budget: number;
    ratingBonus: number;
  };
};

export type RecommendResult = {
  top: ScoredEquipment[];
  others: ScoredEquipment[];
  totalCandidates: number;
};

const allItems = equipmentDb.items as EquipmentItem[];

/** 単一商品の各軸スコアを返す（0〜各軸満点） */
export function scoreItem(item: EquipmentItem, input: RecommendInput): ScoredEquipment["scoreBreakdown"] & { total: number } {
  // 業種マッチ: 30点満点
  let industry = 0;
  if (!input.industry) {
    industry = 15; // 業種未指定なら半分付与
  } else if (item.industries.includes(input.industry)) {
    industry = 30;
  } else if (item.industries.length === 0) {
    industry = 10; // 業種限定なし扱い
  }

  // 危険源マッチ: 30点満点
  let hazard = 0;
  if (!input.hazard) {
    hazard = 15;
  } else if (item.hazards.includes(input.hazard)) {
    hazard = 30;
  } else if (item.hazards.includes("all")) {
    hazard = 20;
  }

  // 季節マッチ: 15点満点
  let season = 0;
  if (!input.season || input.season === "all") {
    season = item.seasons.includes("all") ? 15 : 10;
  } else if (item.seasons.includes(input.season)) {
    season = 15;
  } else if (item.seasons.includes("all")) {
    season = 8; // 通年品は減点
  }

  // 予算マッチ: 15点満点
  let budget = 0;
  if (input.budgetCap === undefined || !Number.isFinite(input.budgetCap)) {
    budget = 10;
  } else if (item.priceMin <= input.budgetCap) {
    // priceMin が予算内なら 15点、上限ギリギリだと減点
    const ratio = item.priceMin / input.budgetCap;
    budget = Math.round(15 - ratio * 5);
    if (budget < 5) budget = 5;
  } else {
    budget = 0;
  }

  // 評価ボーナス: 10点満点（rating 4.0=0, 4.5=5, 5.0=10）
  let ratingBonus = 0;
  if (typeof item.rating === "number") {
    const r = Math.max(4.0, Math.min(5.0, item.rating));
    ratingBonus = Math.round((r - 4.0) * 10);
  }

  const total = industry + hazard + season + budget + ratingBonus;
  return { industry, hazard, season, budget, ratingBonus, total };
}

/**
 * 入力条件に対して全商品をスコアリングし、上位5商品 + 次点10商品を返す。
 * 予算オーバー商品は除外（スコア計算では budget=0）。
 */
export function recommendEquipment(input: RecommendInput): RecommendResult {
  const scored: ScoredEquipment[] = allItems
    .map((item) => {
      const breakdown = scoreItem(item, input);
      return {
        ...item,
        score: breakdown.total,
        scoreBreakdown: {
          industry: breakdown.industry,
          hazard: breakdown.hazard,
          season: breakdown.season,
          budget: breakdown.budget,
          ratingBonus: breakdown.ratingBonus,
        },
      };
    })
    // 予算オーバー商品は表示候補から除外
    .filter((it) => {
      if (input.budgetCap === undefined || !Number.isFinite(input.budgetCap)) return true;
      return it.priceMin <= input.budgetCap;
    });

  // 同点時は rating(降順) → priceMin(昇順) → id(昇順)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    if (a.priceMin !== b.priceMin) return a.priceMin - b.priceMin;
    return a.id.localeCompare(b.id);
  });

  // カテゴリ重複を抑えて多様性を出す（上位5件はカテゴリかぶりを最大2件まで）
  const top: ScoredEquipment[] = [];
  const catCount = new Map<string, number>();
  for (const it of scored) {
    if (top.length >= 5) break;
    const c = catCount.get(it.categoryId) ?? 0;
    if (c >= 2) continue;
    top.push(it);
    catCount.set(it.categoryId, c + 1);
  }
  // 5件未満なら制約なしで埋める（候補が少ない場合のフォールバック）
  if (top.length < 5) {
    for (const it of scored) {
      if (top.length >= 5) break;
      if (!top.includes(it)) top.push(it);
    }
  }

  const others = scored.filter((it) => !top.includes(it)).slice(0, 10);

  return { top, others, totalCandidates: scored.length };
}

/** 同カテゴリの近接商品を取得（商品詳細ページの「同カテゴリ他商品」表示用） */
export function relatedInCategory(itemId: string, n = 3): EquipmentItem[] {
  const target = allItems.find((it) => it.id === itemId);
  if (!target) return [];
  return allItems
    .filter((it) => it.categoryId === target.categoryId && it.id !== itemId)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, n);
}

/** ID から商品取得 */
export function getEquipmentById(id: string): EquipmentItem | undefined {
  return allItems.find((it) => it.id === id);
}

/** 全商品（generateStaticParams 等で利用） */
export function getAllEquipment(): EquipmentItem[] {
  return allItems;
}
