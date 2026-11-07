import { afterEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn(async () => 1000));
vi.mock("@/lib/prisma", () => ({ prisma: { sdsSearch: { count } } }));

import { getSdsSearchLimit, isOverLimit, sdsMonthlyLimit } from "./plan-limits";
import { PAID_MODE } from "./paid-mode";

describe("サイト機能の無料・回数無制限方針", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("環境の旧課金フラグだけで有料機能へ切り替わらない", () => {
    vi.stubEnv("NEXT_PUBLIC_PAID_MODE", "true");
    expect(PAID_MODE).toBe(false);
  });

  it.each(["free", "standard", "pro"] as const)("%s の検索履歴が多くても利用を止めない", async (plan) => {
    expect(sdsMonthlyLimit(plan)).toBeNull();
    const limit = await getSdsSearchLimit("user-test", plan);
    expect(limit).toEqual({ plan, monthlyLimit: null, remaining: null, used: 1000 });
    expect(isOverLimit(limit)).toBe(false);
  });

  it("未ログイン・旧上限情報でも回数制限を適用しない", async () => {
    expect(await getSdsSearchLimit(null, "free")).toEqual({ plan: "free", monthlyLimit: null, remaining: null, used: 0 });
    expect(isOverLimit({ plan: "free", monthlyLimit: 3, used: 10, remaining: 0 })).toBe(false);
  });
});
