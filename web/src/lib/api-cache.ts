/**
 * CDN cache headers for dynamic AI/data routes.
 *
 * F-005 (post-2week regression audit, /admin/audits/post-2week-regression):
 * 動的AIルートはCDNキャッシュなしで毎回Function invocationを焼いていた。
 * 3ヘッダ構成でブラウザ・汎用CDN・Vercel Edge それぞれに指示する。
 *
 * - Cache-Control: ブラウザ向け。max-age=0 で毎回サーバ問い合わせ、s-maxage で
 *   共有キャッシュ(CDN)に保持期間を伝える。
 * - CDN-Cache-Control: Cache-Controlを汎用CDN向けにオーバーライド。
 * - Vercel-CDN-Cache-Control: Vercel Edge専用ディレクティブ(他CDNを通る場合に分離可能)。
 *
 * 注意: Vercel Edge Cacheは既定でGET/HEADのみ自動キャッシュする。POSTルートに
 * 本ヘッダを付与しても現状はEdge Cacheされない。GET化または next/cache 移行は
 * 後続タスク(F-005 follow-up)で対応する。
 */

const CACHE_PROFILES = {
  /** 完全に静的な応答（バージョンスタンプ・定数取得など） */
  STATIC: { sMaxAge: 86400, swr: 604800 },
  /** 日次更新系（事故DB列挙、ニュース、法改正一覧、安全アラート等） */
  DAILY: { sMaxAge: 3600, swr: 86400 },
  /** 固定パラメータ系（特定条文・特定問題・特定テキスト→特定出力） */
  INDUSTRY: { sMaxAge: 14400, swr: 86400 },
  /** 検索クエリ・seed依存などリアルタイム性が必要なもの */
  REALTIME: { sMaxAge: 300, swr: 3600 },
} as const;

export type CacheProfile = keyof typeof CACHE_PROFILES;

/**
 * 成功応答(2xx)用のCDNキャッシュヘッダ3点セットを返す。
 * NextResponse.json の `{ headers }` に展開して使う。
 */
export function cdnCacheHeaders(profile: CacheProfile): Record<string, string> {
  const { sMaxAge, swr } = CACHE_PROFILES[profile];
  const cdnValue = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
  return {
    "Cache-Control": `public, max-age=0, must-revalidate, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": cdnValue,
    "Vercel-CDN-Cache-Control": cdnValue,
  };
}

/**
 * エラー応答(4xx/5xx)用のキャッシュ無効化ヘッダ。
 * 一時的な障害状態をCDNが配信し続けるのを防ぐ。
 */
export function noStoreHeaders(): Record<string, string> {
  const value = "no-store, must-revalidate";
  return {
    "Cache-Control": value,
    "CDN-Cache-Control": value,
    "Vercel-CDN-Cache-Control": value,
  };
}
