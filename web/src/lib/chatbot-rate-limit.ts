/**
 * P2-5: チャットボットAPIの簡易IPレート制限（濫用防止）。
 *
 * 設計:
 * - プロセスローカルの固定ウィンドウ方式（chatbot-cache.ts と同じく in-memory）。
 *   Vercel のサーバレスインスタンスは短命かつ分散のため、これは「完璧な制限」ではなく
 *   単一インスタンスへの連打を抑える best-effort の濫用緩和である（環境変数追加なし）。
 * - 通常利用では到達しない緩い上限に設定（10分あたり40回）。
 * - 制限到達時は公式DB（e-Gov・あんぜんサイト）への代替案内を返す想定。
 */

type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 10 * 60 * 1000; // 10分
const MAX_REQUESTS = 40; // 1IPあたり10分で40回（通常利用は十分余裕、連打のみ抑制）
const MAX_TRACKED_IPS = 5000; // メモリ保護: 超過時は全消去（短命インスタンス前提）

const buckets = new Map<string, Bucket>();

/** リクエストからクライアントIPを推定する（Vercel/プロキシ前提）。 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/** 固定ウィンドウでIP単位の回数を判定する。 */
export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  if (buckets.size > MAX_TRACKED_IPS) buckets.clear();
  const b = buckets.get(ip);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (b.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - b.windowStart)) / 1000));
    return { allowed: false, retryAfterSec };
  }
  b.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** 制限到達時にユーザーへ返す代替案内メッセージ。 */
export function rateLimitMessage(retryAfterSec: number): string {
  const min = Math.ceil(retryAfterSec / 60);
  return (
    `アクセスが集中しています。お手数ですが約${min}分後に再度お試しください。\n\n` +
    `お急ぎの場合は公式情報をご利用ください：\n` +
    `- e-Gov 法令検索: https://laws.e-gov.go.jp/\n` +
    `- 厚労省 職場のあんぜんサイト: https://anzeninfo.mhlw.go.jp/`
  );
}

/** テスト用リセット。 */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}

/** テスト/監視用: 現在の上限値。 */
export const RATE_LIMIT_CONFIG = { windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS } as const;
