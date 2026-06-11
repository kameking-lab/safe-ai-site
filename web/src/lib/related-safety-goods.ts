/**
 * テキスト → 関連保護具のスコアリング（related-content.ts から分離）。
 *
 * C-1（モバイル実速度の構造是正）: related-content.ts は事故データセット・通達DB・
 * 設備DBを静的 import しており、保護具マッチだけが必要な ContextualPpePicks
 * （クライアント・多数ページに常設）から import すると全データがページバンドルに
 * 同梱されてしまう。保護具データのみに依存する軽量モジュールとして切り出す。
 */

import { safetyGoodsItems, type SafetyGoodsItem } from "@/data/mock/safety-goods";

/** 日本語トークン化（2文字以上の漢字・かな・英数字） */
function tokenize(text: string): string[] {
  return (text.match(/[一-龥ぁ-んァ-ヶa-zA-Z0-9]{2,}/g) ?? []).filter((t) => t.length >= 2);
}

/** 任意テキスト → 関連保護具（通達・事故ページ下部のおすすめ用） */
export function relatedSafetyGoodsByText(
  text: string,
  opts: { limit?: number } = {}
): SafetyGoodsItem[] {
  const limit = Math.max(1, Math.min(10, opts.limit ?? 4));
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const scored = safetyGoodsItems.map((g) => {
    const haystack = `${g.name} ${g.description} ${g.tags.join(" ")}`;
    let score = 0;
    tokens.forEach((t) => {
      if (haystack.includes(t)) score += 1;
    });
    return { g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.g);
}
