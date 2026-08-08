/**
 * 商品カタログ公開境界。
 *
 * 既存データには、メーカー・製品名・価格・規格適合・評価件数について
 * 一次資料まで追跡できない生成レコードが含まれる。個別レコードの出典確認が
 * 完了するまで、検索・推薦・構造化データ・サイトマップへ一切出さない。
 */
export const EQUIPMENT_CATALOG_QUARANTINED = true as const;

export const EQUIPMENT_CATALOG_QUARANTINE = {
  status: "quarantined",
  reasonCode: "PRODUCT_PROVENANCE_UNVERIFIED",
  quarantinedAt: "2026-07-24",
  publicItemCount: 0,
  note: "商品名、メーカー、規格適合、価格、評価の一次資料確認が完了していないため、商品単位の検索・推薦を停止しています。",
} as const;
