/**
 * テキスト → 関連保護具のスコアリング（related-content.ts から分離）。
 *
 * C-1（モバイル実速度の構造是正）: related-content.ts は事故データセット・通達DB・
 * 設備DBを静的 import しており、保護具マッチだけが必要な ContextualPpePicks
 * （クライアント・多数ページに常設）から import すると全データがページバンドルに
 * 同梱されてしまう。保護具データのみに依存する軽量モジュールとして切り出す。
 */

import type { SafetyGoodsItem } from "@/data/mock/safety-goods";

/** 任意テキスト → 関連保護具（通達・事故ページ下部のおすすめ用） */
export function relatedSafetyGoodsByText(
  text: string,
  opts: { limit?: number } = {}
): SafetyGoodsItem[] {
  void text;
  void opts;
  // 未検証SKUを単語一致だけで安全文脈へ推薦しない。
  return [];
}
