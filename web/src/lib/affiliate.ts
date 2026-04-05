export const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || "";
export const RAKUTEN_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || "";

export function amazonSearchUrl(query: string): string {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
}

export function rakutenSearchUrl(query: string): string {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/?f=1&grp=product&sid=${RAKUTEN_ID}`;
}
