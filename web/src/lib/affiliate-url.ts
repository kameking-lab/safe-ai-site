/**
 * アフィリエイトURL生成ライブラリ。
 * クライアント／サーバー共通。NEXT_PUBLIC_* はビルド時に埋め込まれる。
 *
 * 環境変数（後方互換のため両方を許容）:
 *   - Amazon: NEXT_PUBLIC_AMAZON_AFFILIATE_ID（推奨） / NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG（旧名）
 *   - 楽天:   NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID
 */

const AMAZON_TAG = (
  process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_ID ||
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG ||
  ""
).trim();

const RAKUTEN_AFFID = (process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || "").trim();

const AMAZON_HOSTS = ["amazon.co.jp", "amazon.com"];
const RAKUTEN_HOST = "rakuten.co.jp";
const RAKUTEN_AFFILIATE_HOST = "hb.afl.rakuten.co.jp";

export function getAmazonTag(): string {
  return AMAZON_TAG;
}

export function getRakutenAffiliateId(): string {
  return RAKUTEN_AFFID;
}

/** Amazon URL（既存または新規）にアソシエイトタグを付与する */
export function appendAmazonTag(url: string): string {
  if (!AMAZON_TAG) return url;
  try {
    const u = new URL(url);
    if (!AMAZON_HOSTS.some((host) => u.hostname.endsWith(host))) return url;
    u.searchParams.set("tag", AMAZON_TAG);
    return u.toString();
  } catch {
    return url;
  }
}

/** 検索クエリまたはASINからAmazonアフィリエイトURLを生成する */
export function generateAmazonAffiliateUrl(query: string, asin?: string): string {
  const baseUrl = asin
    ? `https://www.amazon.co.jp/dp/${encodeURIComponent(asin)}`
    : `https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}`;
  return appendAmazonTag(baseUrl);
}

/** Amazon検索URLをアフィリエイトタグ付きで生成する（generateAmazonAffiliateUrl のエイリアス） */
export function generateAmazonSearchUrl(query: string): string {
  return generateAmazonAffiliateUrl(query);
}

/** 楽天市場の任意URLを hb.afl.rakuten.co.jp 経由のアフィリエイトリンクに変換する */
export function generateRakutenAffiliateUrl(productUrl: string): string {
  if (!RAKUTEN_AFFID) return productUrl;
  try {
    const u = new URL(productUrl);
    // 既にアフィリエイトリダイレクトを通過済みなら触らない
    if (u.hostname === RAKUTEN_AFFILIATE_HOST) return productUrl;
    if (!u.hostname.endsWith(RAKUTEN_HOST)) return productUrl;
  } catch {
    return productUrl;
  }
  return `https://${RAKUTEN_AFFILIATE_HOST}/ichiba/${RAKUTEN_AFFID}/?pc=${encodeURIComponent(productUrl)}&m=`;
}

/** 楽天検索URLをアフィリエイト経由で生成する */
export function generateRakutenSearchUrl(query: string): string {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/`;
  return generateRakutenAffiliateUrl(searchUrl);
}
