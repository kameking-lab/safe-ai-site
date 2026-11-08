import { isPaidModeReady } from "@/lib/stripe-price-policy";
export { PRO_MONTHLY_PRICE_YEN, FREE_DAILY_CHAT, PRO_DAILY_CHAT, safeReturnPath, proStartHref } from "@/lib/pro-start";

/**
 * 安全AI Pro（月額980円）の販売可否。ウェブ＝Stripe、アプリ＝App Store（RevenueCat）。
 * どちらで払っても同じ会員の共通台帳（MOBILE_LEDGER）で Pro になるため、台帳が前提。
 * 旧5プランの料金UI（PAID_MODE）とは別物で、こちらは単一プランだけを扱う。
 */
/** ウェブで Stripe Checkout を開けるか（価格ID・秘密鍵・販売フラグ・共通台帳がそろっている）。 */
export function webProSalesReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MOBILE_LEDGER_ENABLED === "true" && isPaidModeReady();
}

/** アプリで App Store の購入シートを開けるか（/api/mobile/v1/billing/config の ready と同じ条件）。 */
export function appStoreSalesReady(env: NodeJS.ProcessEnv = process.env): boolean {
  const appleReady = !!(env.AUTH_APPLE_ID && env.AUTH_APPLE_SECRET);
  const serverVerificationReady = !!(
    env.REVENUECAT_SECRET_API_KEY &&
    env.REVENUECAT_V2_SECRET_API_KEY &&
    env.REVENUECAT_PROJECT_ID &&
    env.REVENUECAT_IOS_V2_PRODUCT_ID &&
    env.REVENUECAT_WEBHOOK_AUTHORIZATION
  );
  return (
    env.MOBILE_IAP_ENABLED === "true" &&
    env.MOBILE_LEDGER_ENABLED === "true" &&
    !!env.REVENUECAT_IOS_PUBLIC_SDK_KEY &&
    !!env.REVENUECAT_IOS_PRODUCT_ID &&
    !!env.REVENUECAT_IOS_OFFERING_ID &&
    appleReady &&
    serverVerificationReady
  );
}
