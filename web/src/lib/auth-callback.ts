/**
 * ログイン後に戻してよい行き先（/auth/signin の callbackUrl）。それ以外はトップへ戻す。
 * - iOS アプリのログイン受け渡し（PKCE の flow ID のみ。検証子は端末の Keychain にある）
 * - 安全AI Pro の購入開始（ログイン→そのまま Stripe Checkout へ進むため）
 */
export const NATIVE_SIGNIN_CALLBACK =
  /^\/api\/mobile\/v1\/auth\/authorize\?flow=[0-9a-f-]{36}(?:&confirmed=1)?$/;
export const PRO_START_CALLBACK =
  /^\/pricing\/start(?:\?returnTo=%2F(?!%2[Ff]|%5[Cc])[A-Za-z0-9%._~!*'()-]{0,400})?$/;

export function allowedSignInCallback(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return NATIVE_SIGNIN_CALLBACK.test(value) || PRO_START_CALLBACK.test(value) ? value : null;
}

/** Auth.js のエラーコードのうち、画面に理由を出すもの（個人情報を含まない固定の語だけ）。 */
export const AUTH_ERROR_CODES = [
  "OAuthAccountNotLinked",
  "AccessDenied",
  "Configuration",
  "Verification",
  "OAuthSignin",
  "OAuthCallback",
  "OAuthCallbackError",
  "CallbackRouteError",
  "InvalidCheck",
  "Default",
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
export function authErrorCode(value: unknown): AuthErrorCode | null {
  return typeof value === "string" && (AUTH_ERROR_CODES as readonly string[]).includes(value) ? (value as AuthErrorCode) : null;
}
