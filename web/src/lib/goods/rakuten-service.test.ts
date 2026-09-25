import { afterEach, describe, expect, it, vi } from "vitest";
import { createRakutenGoodsService, type GoodsSearch } from "./rakuten-service";
import type { RakutenGoodsStore } from "./rakuten-store";
import type { ProductResult } from "./product-result";

const product = { itemCode: "shop:helmet-1", itemName: "産業用保護帽",
  mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/helmet.jpg"],
  reviewAverage: 4.6, reviewCount: 34, availability: 1,
  affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-1/" };
const search: GoodsSearch = { categoryId: "head-protection", featureId: "fall",
  keyword: "産業用 保護帽 墜落時保護", applicationId: "test-application",
  accessKey: "test-access-key", affiliateId: "test-affiliate", environment: "production" };

function cluster() {
  const cache = new Map<string, { result: ProductResult | null; expiresAt: number; token: string | null; leaseUntil: number }>();
  const gates = new Map<string, { token: string | null; leaseUntil: number; nextAllowedAt: number; cooldownUntil: number }>();
  const instance = (): RakutenGoodsStore => ({
    async read(key) {
      const row = cache.get(key);
      return { result: row && row.expiresAt > Date.now() ? row.result : null,
        pending: !!row && row.leaseUntil > Date.now() };
    },
    async claim(key, token) {
      const row = cache.get(key);
      if (row && (row.expiresAt > Date.now() || row.leaseUntil > Date.now())) return false;
      cache.set(key, { result: null, expiresAt: 0, token, leaseUntil: Date.now() + 15_000 });
      return true;
    },
    async complete(key, token, result, ttlMs) {
      const row = cache.get(key);
      if (row?.token === token) cache.set(key, { result, expiresAt: Date.now() + ttlMs, token: null, leaseUntil: 0 });
    },
    async acquireGate(key, token) {
      const row = gates.get(key);
      if (row && (row.leaseUntil > Date.now() || row.nextAllowedAt > Date.now() || row.cooldownUntil > Date.now())) return false;
      gates.set(key, { token, leaseUntil: Date.now() + 15_000, nextAllowedAt: Date.now() + 16_000,
        cooldownUntil: row?.cooldownUntil ?? 0 });
      return true;
    },
    async releaseGate(key, token, cooldownMs) {
      const row = gates.get(key);
      if (row?.token === token) gates.set(key, { token: null, leaseUntil: 0,
        nextAllowedAt: Date.now() + Math.max(1_100, cooldownMs),
        cooldownUntil: Math.max(row.cooldownUntil, Date.now() + cooldownMs) });
    },
  });
  return { instance, cache, gates };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("shared Rakuten product service", () => {
  it("aggregates a same-key miss across two isolated instances and reuses the warm result", async () => {
    const shared = cluster();
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return Response.json({ items: [product] });
    }) as unknown as typeof fetch;
    const a = createRakutenGoodsService(shared.instance(), fetcher);
    const b = createRakutenGoodsService(shared.instance(), fetcher);
    const [first, second] = await Promise.all([a(search), b(search)]);
    expect(first).toMatchObject({ status: "ready", items: [{ rating: 4.6, reviewCount: 34 }] });
    expect(second).toEqual(first);
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect(await b(search)).toEqual(first);
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect(JSON.stringify([...shared.cache])).not.toContain(search.applicationId);
    expect(JSON.stringify([...shared.cache])).not.toContain(search.accessKey);
  });

  it("gates separate keys by applicationId across two instances with at least one second between starts", async () => {
    const shared = cluster();
    const starts: number[] = [];
    const fetcher = vi.fn(async () => { starts.push(Date.now()); return Response.json({ items: [product] }); }) as unknown as typeof fetch;
    const a = createRakutenGoodsService(shared.instance(), fetcher);
    const b = createRakutenGoodsService(shared.instance(), fetcher);
    expect((await a(search)).status).toBe("ready");
    expect(await b({ ...search, categoryId: "eye-face-protection", keyword: "保護メガネ" })).toMatchObject({ status: "unavailable", reason: "rate_limited" });
    expect(starts).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 1_150));
    expect((await b({ ...search, categoryId: "hearing", keyword: "耳栓" })).status).toBe("ready");
    expect(starts).toHaveLength(2);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(1_000);
  });

  it("shares 429 Retry-After cooldown, negative results, and affiliate-specific cache keys", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    const shared = cluster();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "2" } }))
      .mockImplementation(async () => Response.json({ items: [product] })) as typeof fetch;
    const a = createRakutenGoodsService(shared.instance(), fetcher);
    const b = createRakutenGoodsService(shared.instance(), fetcher);
    expect(await a(search)).toMatchObject({ status: "unavailable", reason: "rate_limited" });
    expect(await b({ ...search, categoryId: "eye-face-protection" })).toMatchObject({ status: "unavailable", reason: "rate_limited" });
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_001);
    expect((await b({ ...search, categoryId: "hearing" })).status).toBe("ready");
    await vi.advanceTimersByTimeAsync(1_101);
    expect((await a({ ...search, affiliateId: "new-affiliate" })).status).toBe("ready");
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3);
    const [url] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[2] as [URL];
    expect(url.searchParams.get("affiliateId")).toBe("new-affiliate");
  });

  it("expires zero-item results and briefly caches authorization failures without inventing products", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    const shared = cluster();
    const fetcher = vi.fn()
      .mockImplementationOnce(async () => Response.json({ items: [] }))
      .mockImplementationOnce(async () => new Response("", { status: 401 }))
      .mockImplementation(async () => Response.json({ items: [product] })) as typeof fetch;
    const service = createRakutenGoodsService(shared.instance(), fetcher);
    expect(await service(search)).toMatchObject({ status: "no_qualified_items", items: [], reason: null });
    expect((await service(search)).status).toBe("no_qualified_items");
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1);
    expect(await service(search)).toMatchObject({ status: "unavailable", items: [], reason: "authorization_failed" });
    expect((await service(search)).reason).toBe("authorization_failed");
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(60_001);
    expect((await service(search)).status).toBe("ready");
  });

  it("treats malformed success and timeouts as short unavailable results", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    const shared = cluster();
    const fetcher = vi.fn()
      .mockImplementationOnce(async () => Response.json({ error: "malformed" }))
      .mockImplementationOnce(async () => { throw new DOMException("timeout", "TimeoutError"); }) as typeof fetch;
    const service = createRakutenGoodsService(shared.instance(), fetcher);
    expect(await service(search)).toMatchObject({ status: "unavailable", reason: "upstream_error", items: [] });
    await vi.advanceTimersByTimeAsync(5_001);
    expect(await service(search)).toMatchObject({ status: "unavailable", reason: "timeout", items: [] });
  });

  it("fails closed without shared state or on a store error", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await createRakutenGoodsService(null, fetcher)(search)).toMatchObject({ status: "unavailable", items: [] });
    const badStore = { ...cluster().instance(), read: async () => { throw new Error("database unavailable"); } };
    expect(await createRakutenGoodsService(badStore, fetcher)(search)).toMatchObject({ status: "unavailable", items: [] });
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });
});
