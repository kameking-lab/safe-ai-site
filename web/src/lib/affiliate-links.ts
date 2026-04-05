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

/** 楽天URLをアフィリエイトリダイレクト形式（hb.afl.rakuten.co.jp）でラップする */
export function withRakutenAffiliateId(url: string): string {
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID?.trim() || "5291f19d.a0fc3c16.5291f19e.b91d11f6";
  try {
    const u = new URL(url);
    if (!u.hostname.includes("rakuten.co.jp")) return url;
    return `https://hb.afl.rakuten.co.jp/ichiba/${affiliateId}/?pc=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
