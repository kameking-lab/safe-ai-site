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

/** Rakuten API由来の実画像・購入者評価が確認できた商品だけを公開する。 */
export function selectHighRatedGoodsProducts(raw: unknown): RatedGoodsProduct[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { items?: unknown }).items)) return [];
  const result: RatedGoodsProduct[] = [];
  const seen = new Set<string>();
  for (const entry of (raw as { items: unknown[] }).items) {
    const item = (entry && typeof entry === "object" && "item" in entry
      ? (entry as { item: RakutenItem }).item
      : entry) as RakutenItem | null;
    if (!item || typeof item !== "object") continue;
    const rating = Number(item.reviewAverage);
    const reviewCount = Number(item.reviewCount);
    const name = typeof item.itemName === "string" ? item.itemName.trim() : "";
    const id = typeof item.itemCode === "string" ? item.itemCode : "";
    const images = Array.isArray(item.mediumImageUrls) ? item.mediumImageUrls : [];
    const imageUrl = allowedHttpsUrl(images[0], ["rakuten.co.jp", "rakuten.ne.jp"]);
    const affiliateUrl = allowedHttpsUrl(item.affiliateUrl, ["rakuten.co.jp"]);
    if (!id || !name || !imageUrl || !affiliateUrl || seen.has(id)) continue;
    if (!Number.isFinite(rating) || rating < MIN_GOODS_RATING || rating > 5) continue;
    if (!Number.isInteger(reviewCount) || reviewCount < MIN_GOODS_REVIEWS) continue;
    if (Number(item.availability) !== 1) continue;
    seen.add(id);
    result.push({ id, name, imageUrl, rating, reviewCount, affiliateUrl });
    if (result.length === 6) break;
  }
  return result;
}
