/**
 * クライアント／サーバー共通。NEXT_PUBLIC_* はビルド時に埋め込まれる。
 * 秘密（APIキー）は使わず、公開タグのみ。
 */

export function withAmazonAssociateTag(url: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim();
  if (!tag) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("amazon.co.jp") && !u.hostname.includes("amazon.com")) return url;
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url;
  }
}

/** 楽天の検索URLに afid を付与（アフィリエイト管理画面で発行したID） */
export function withRakutenAffiliateId(url: string): string {
  const afid = process.env.NEXT_PUBLIC_RAKUTEN_AFID?.trim();
  if (!afid) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("rakuten.co.jp")) return url;
    u.searchParams.set("afid", afid);
    return u.toString();
  } catch {
    return url;
  }
}
