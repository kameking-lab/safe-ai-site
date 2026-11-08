import product from "@/lib/mobile/product-policy";

/** ブラウザ・アプリ両方で使う、安全AI Pro の購入入口（サーバー専用の判定は pro-sales.ts）。 */
export const PRO_MONTHLY_PRICE_YEN = product.monthlyPrice;
export const FREE_DAILY_CHAT = product.limits.free.law_chat;
export const PRO_DAILY_CHAT = product.limits.pro.law_chat;

/** 購入後に戻す先。サイト内の相対パスだけを許し、外部URL・プロトコル相対・制御文字は捨てる。 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.length > 300) return null;
  if (/[\u0000-\u001f\u007f]/.test(v)) return null;
  if (v.startsWith("/api/") || v.startsWith("/auth/") || v.startsWith("/pricing/start")) return null;
  try {
    const url = new URL(v, "https://www.anzen-ai-portal.jp");
    if (url.origin !== "https://www.anzen-ai-portal.jp") return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

/** 有料機能に当たった所から押す、購入の入口（ログイン→Stripe まで止まらない）。 */
export function proStartHref(returnTo?: string | null): string {
  const back = safeReturnPath(returnTo ?? null);
  return back ? `/pricing/start?returnTo=${encodeURIComponent(back)}` : "/pricing/start";
}
