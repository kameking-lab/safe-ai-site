import { externalCredentialedServicesAllowed } from "@/lib/server/deployment-safety";

export type PaidPlanName = "standard" | "pro";

/** Stripe Price ID を、サーバー側の固定 allowlist で付与プランへ解決する。未知の値は fail-closed。 */
export function resolveStripePlan(priceId: string | null | undefined): PaidPlanName | null {
  if (!priceId) return null;
  const standard = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM?.trim();
  const pro = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO?.trim();
  if (standard && priceId === standard) return "standard";
  if (pro && priceId === pro) return "pro";
  return null;
}

export function isPaidModeReady(): boolean {
  return (
    externalCredentialedServicesAllowed() &&
    process.env.NEXT_PUBLIC_PAID_MODE === "true" &&
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO?.trim())
  );
}
