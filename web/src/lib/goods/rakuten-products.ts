export const MIN_GOODS_RATING = 4.2;
export const MIN_GOODS_REVIEWS = 10;

export type RatedGoodsProduct = {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  affiliateUrl: string;
};

type RakutenItem = {
  itemCode?: unknown;
  itemName?: unknown;
  affiliateUrl?: unknown;
  mediumImageUrls?: unknown;
  reviewAverage?: unknown;
  reviewCount?: unknown;
  availability?: unknown;
};

function allowedHttpsUrl(value: unknown, hosts: readonly string[]): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * 商品配列を取り出す。公式ドキュメントの例は `items`/`item` だが、楽天市場APIの
 * 実応答は従来 `Items`/`Item` の大文字キーを返すため両方を受け付ける。
 */
export function rakutenItemList(raw: unknown): unknown[] | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { items?: unknown; Items?: unknown };
  if (Array.isArray(record.items)) return record.items;
  return Array.isArray(record.Items) ? record.Items : null;
}

function unwrapItem(entry: unknown): RakutenItem | null {
  if (!entry || typeof entry !== "object") return null;
  if ("item" in entry) return (entry as { item: RakutenItem }).item;
  if ("Item" in entry) return (entry as { Item: RakutenItem }).Item;
  return entry as RakutenItem;
}

/** 選別の内訳（件数のみ）。各商品は最初に該当した除外理由だけで数える。 */
export type GoodsSelectionStats = {
  received: number;
  qualified: number;
  missingFields: number;
  badImage: number;
  badAffiliate: number;
  duplicate: number;
  lowRating: number;
  fewReviews: number;
  unavailable: number;
};

const MAX_GOODS_ITEMS = 6;

/** 実画像・購入者評価の条件で選別し、表示商品と除外理由別の件数を返す。 */
export function selectGoodsProductsWithStats(raw: unknown): { items: RatedGoodsProduct[]; stats: GoodsSelectionStats } {
  const list = rakutenItemList(raw) ?? [];
  const stats: GoodsSelectionStats = { received: list.length, qualified: 0, missingFields: 0, badImage: 0,
    badAffiliate: 0, duplicate: 0, lowRating: 0, fewReviews: 0, unavailable: 0 };
  const items: RatedGoodsProduct[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const item = unwrapItem(entry);
    const name = item && typeof item.itemName === "string" ? item.itemName.trim() : "";
    const id = item && typeof item.itemCode === "string" ? item.itemCode : "";
    if (!item || typeof item !== "object" || !id || !name) { stats.missingFields += 1; continue; }
    const rating = Number(item.reviewAverage);
    const reviewCount = Number(item.reviewCount);
    const images = Array.isArray(item.mediumImageUrls) ? item.mediumImageUrls : [];
    // formatVersion=2 は文字列配列、formatVersion=1 は {imageUrl} の配列。
    const firstImage: unknown = images[0] && typeof images[0] === "object" && "imageUrl" in images[0]
      ? (images[0] as { imageUrl: unknown }).imageUrl : images[0];
    const imageUrl = allowedHttpsUrl(firstImage, ["rakuten.co.jp", "rakuten.ne.jp"]);
    const affiliateUrl = allowedHttpsUrl(item.affiliateUrl, ["rakuten.co.jp"]);
    if (!imageUrl) { stats.badImage += 1; continue; }
    if (!affiliateUrl) { stats.badAffiliate += 1; continue; }
    if (seen.has(id)) { stats.duplicate += 1; continue; }
    if (!Number.isFinite(rating) || rating < MIN_GOODS_RATING || rating > 5) { stats.lowRating += 1; continue; }
    if (!Number.isInteger(reviewCount) || reviewCount < MIN_GOODS_REVIEWS) { stats.fewReviews += 1; continue; }
    if (Number(item.availability) !== 1) { stats.unavailable += 1; continue; }
    seen.add(id);
    stats.qualified += 1;
    if (items.length < MAX_GOODS_ITEMS) items.push({ id, name, imageUrl, rating, reviewCount, affiliateUrl });
  }
  return { items, stats };
}

/** Rakuten API由来の実画像・購入者評価が確認できた商品だけを公開する。 */
export function selectHighRatedGoodsProducts(raw: unknown): RatedGoodsProduct[] {
  return selectGoodsProductsWithStats(raw).items;
}

export type RakutenResponseShape = {
  /** 公式出力の `count`（総ヒット数）。0〜1e7の整数以外は null。 */
  count: number | null;
  /** `items`/`Items` キーの有無と型。値そのものは返さない。 */
  itemsKey: "absent" | "array" | "object" | "other";
  hasErrors: boolean;
};

/** 応答本文の形だけを固定値・数値で要約する（上流の文字列は含めない）。 */
export function describeRakutenResponse(raw: unknown): RakutenResponseShape {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { count: null, itemsKey: "absent", hasErrors: false };
  const record = raw as Record<string, unknown>;
  const count = typeof record.count === "number" && Number.isInteger(record.count)
    && record.count >= 0 && record.count <= 10_000_000 ? record.count : null;
  const present = ["items", "Items"].filter((key) => key in record).map((key) => record[key]);
  const itemsKey = present.some(Array.isArray) ? "array"
    : present.length === 0 ? "absent"
      : present.some((value) => value !== null && typeof value === "object") ? "object" : "other";
  return { count, itemsKey, hasErrors: "errors" in record || "error" in record };
}
