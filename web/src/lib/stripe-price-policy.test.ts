import { afterEach, describe, expect, it, vi } from "vitest";
import { isPaidModeReady, resolveStripePlan } from "./stripe-price-policy";

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

  it("旧課金フラグ・秘密鍵・両Priceが揃っても無料方針では決済を開始しない", () => {
    vi.stubEnv("NEXT_PUBLIC_PAID_MODE", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-secret-not-real");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM", "price_standard_synthetic");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "");
    expect(isPaidModeReady()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "price_pro_synthetic");
    expect(isPaidModeReady()).toBe(false);
  });

});
