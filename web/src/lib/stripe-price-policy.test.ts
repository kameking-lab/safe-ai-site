import { afterEach, describe, expect, it, vi } from "vitest";
import { isPaidModeReady, resolveStripePlan } from "./stripe-price-policy";
import { handleSubscriptionUpdated } from "./stripe-webhook-handlers";

describe("Stripe server-side price policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("設定済みの2価格だけを対応プランへ解決し、未知のPriceを拒否する", () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM", "price_standard_synthetic");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "price_pro_synthetic");
    expect(resolveStripePlan("price_standard_synthetic")).toBe("standard");
    expect(resolveStripePlan("price_pro_synthetic")).toBe("pro");
    expect(resolveStripePlan("price_attacker_controlled")).toBeNull();
    expect(resolveStripePlan(null)).toBeNull();
  });

  it("課金フラグ・秘密鍵・両Priceの全設定が揃わない限り無効", () => {
    vi.stubEnv("NEXT_PUBLIC_PAID_MODE", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-secret-not-real");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM", "price_standard_synthetic");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "");
    expect(isPaidModeReady()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "price_pro_synthetic");
    expect(isPaidModeReady()).toBe(true);
  });

  it("Webhookも未知のPriceをstandardへ昇格させずDB更新前に拒否する", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM", "price_standard_synthetic");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "price_pro_synthetic");
    const updateMany = vi.fn();
    const prisma = { subscription: { updateMany } } as never;
    const subscription = {
      id: "sub_synthetic",
      status: "active",
      customer: "cus_synthetic",
      items: { data: [{ price: { id: "price_unrecognized" } }] },
    } as never;
    await expect(handleSubscriptionUpdated(prisma, subscription)).rejects.toThrow("unrecognized Stripe price");
    expect(updateMany).not.toHaveBeenCalled();
  });
});
