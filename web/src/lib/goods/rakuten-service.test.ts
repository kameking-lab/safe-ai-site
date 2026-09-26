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
const siteContext = { Referer: "https://www.anzen-ai-portal.jp/", Origin: "https://www.anzen-ai-portal.jp" };

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

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

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
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
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

  it("logs only an allowlisted 401/403 code even when the body contains credentials and URLs", async () => {
    const logger = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const secretBody = { error: "invalid_access_key",
      error_description: `accessKey=${search.accessKey} applicationId=${search.applicationId} affiliateId=${search.affiliateId} https://openapi.rakuten.co.jp/private` };
    const fetcher = vi.fn(async () => Response.json(secretBody, { status: 403 })) as unknown as typeof fetch;
    const service = createRakutenGoodsService(cluster().instance(), fetcher);
    const result = await service(search);
    expect(result).toMatchObject({ status: "unavailable", reason: "authorization_failed", items: [], checkedAt: null });
    expect(logger).toHaveBeenCalledExactlyOnceWith("[rakuten-goods] authorization_failed", {
      httpStatus: 403, errorCode: "invalid_access_key",
    });
    const output = JSON.stringify({ result, logs: logger.mock.calls });
    for (const value of [search.applicationId, search.accessKey, search.affiliateId, secretBody.error_description]) {
      expect(output).not.toContain(value);
    }

    logger.mockClear();
    const malicious = vi.fn(async () => Response.json({ error: search.accessKey, error_description: "do not log me" }, { status: 401 })) as unknown as typeof fetch;
    const second = createRakutenGoodsService(cluster().instance(), malicious);
    expect((await second(search)).reason).toBe("authorization_failed");
    expect(logger).toHaveBeenCalledExactlyOnceWith("[rakuten-goods] authorization_failed", {
      httpStatus: 401, errorCode: "unknown",
    });
    expect(JSON.stringify(logger.mock.calls)).not.toContain(search.accessKey);
  });

  it("sends this site's own Referer and Origin with the header accessKey", async () => {
    const fetcher = vi.fn(async () => Response.json({ items: [product] })) as unknown as typeof fetch;
    expect((await createRakutenGoodsService(cluster().instance(), fetcher)(search)).status).toBe("ready");
    const [url, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0] as [URL, RequestInit];
    expect(init.headers).toEqual({ ...siteContext, accessKey: search.accessKey });
    expect(url.searchParams.has("accessKey")).toBe(false);
  });

  it("reads allowlisted 2026 errors.errorMessage codes and drops anything that may echo secrets", async () => {
    const logger = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const bodies: [unknown, string][] = [
      [{ errors: { errorCode: 403, errorMessage: "REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING" } }, "referrer_missing"],
      [{ errors: { errorCode: 403, errorMessage: "Invalid Access Key" } }, "invalid_access_key"],
      [{ errors: { errorCode: 403, errorMessage: `Invalid Access Key ${search.accessKey}` } }, "unknown"],
      [{ errors: { errorCode: 403, errorMessage: "invalid access key" } }, "unknown"],
      [{ errors: { errorCode: 403, errorMessage: `REQUEST_CONTEXT_${search.applicationId}` } }, "request_context_other"],
      [{ errors: { errorCode: 403, errorMessage: "REQUEST_CONTEXT_ORIGIN_https://evil.example" } }, "request_context_other"],
      [{ errors: { errorCode: 403, errorMessage: search.accessKey }, error: "invalid_access_key" }, "invalid_access_key"],
      [{ errors: { errorCode: 403, errorMessage: 403 } }, "unknown"],
      [{ errors: "REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING" }, "unknown"],
      [{ errors: null }, "unknown"],
      [{ errors: ["Invalid Access Key"] }, "unknown"],
    ];
    for (const [body, errorCode] of bodies) {
      logger.mockClear();
      const fetcher = vi.fn(async () => Response.json(body, { status: 403 })) as unknown as typeof fetch;
      expect((await createRakutenGoodsService(cluster().instance(), fetcher)(search)).reason).toBe("authorization_failed");
      expect(logger).toHaveBeenCalledExactlyOnceWith("[rakuten-goods] authorization_failed", { httpStatus: 403, errorCode });
      for (const value of [search.applicationId, search.accessKey, "evil.example"]) {
        expect(JSON.stringify(logger.mock.calls)).not.toContain(value);
      }
    }
  });

  it("probes header versus query only once across instances behind the shared gate", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    vi.stubEnv("VERCEL_ENV", "production");
    const logger = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const shared = cluster();
    const starts: number[] = [];
    const fetcher = vi.fn(async (_url: URL, init?: RequestInit) => {
      starts.push(Date.now());
      return (init?.headers as Record<string, string> | undefined)?.accessKey
        ? Response.json({ error: "unlisted_code", error_description: `secret ${search.accessKey}` }, { status: 403 })
        : Response.json({ items: [product] });
    }) as unknown as typeof fetch;
    const a = createRakutenGoodsService(shared.instance(), fetcher);
    const b = createRakutenGoodsService(shared.instance(), fetcher);
    const firstPromise = a(search);
    await vi.runAllTimersAsync();
    expect(await firstPromise).toMatchObject({ status: "unavailable", reason: "authorization_failed", items: [] });
    const calls = (fetcher as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(1_000);
    const headerUrl = new URL(calls[0]![0] as URL);
    const queryUrl = new URL(calls[1]![0] as URL);
    expect(headerUrl.searchParams.has("accessKey")).toBe(false);
    expect(queryUrl.searchParams.get("accessKey")).toBe(search.accessKey);
    queryUrl.searchParams.delete("accessKey");
    expect(queryUrl.toString()).toBe(headerUrl.toString());
    expect((calls[1]![1] as RequestInit).headers).toEqual(siteContext);
    expect(logger).toHaveBeenCalledWith("[rakuten-goods] auth_transport_probe", {
      headerStatus: 403, headerCode: "unknown", queryStatus: 200, queryCode: null,
    });
    for (const value of [search.applicationId, search.accessKey, search.affiliateId]) {
      expect(JSON.stringify(logger.mock.calls)).not.toContain(value);
    }
    await vi.advanceTimersByTimeAsync(60_001);
    expect((await b({ ...search, categoryId: "hearing" })).reason).toBe("authorization_failed");
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3);
    expect(logger.mock.calls.filter(([message]) => message === "[rakuten-goods] auth_transport_probe")).toHaveLength(1);
  });

  it("shares a 429 cooldown from the one-time query probe", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    vi.stubEnv("VERCEL_ENV", "production");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const shared = cluster();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "unknown" }, { status: 403 }))
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "10" } }))
      .mockResolvedValue(Response.json({ items: [product] })) as typeof fetch;
    const a = createRakutenGoodsService(shared.instance(), fetcher);
    const b = createRakutenGoodsService(shared.instance(), fetcher);
    const first = a(search);
    await vi.runAllTimersAsync();
    expect((await first).reason).toBe("authorization_failed");
    expect((await b({ ...search, categoryId: "hearing" })).reason).toBe("rate_limited");
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await b({ ...search, categoryId: "eye-face-protection" })).status).toBe("ready");
  });

  it("accepts the capitalized Items response key", async () => {
    const fetcher = vi.fn(async () => Response.json({ count: 1, page: 1, Items: [product] })) as unknown as typeof fetch;
    expect(await createRakutenGoodsService(cluster().instance(), fetcher)(search))
      .toMatchObject({ status: "ready", items: [{ id: product.itemCode, rating: 4.6, reviewCount: 34 }] });
  });

  it("logs only a fixed category and status for upstream errors, never the body", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    const logger = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const secret = `accessKey=${search.accessKey} https://openapi.rakuten.co.jp/private`;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ errors: { errorCode: 400, errorMessage: secret } }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ errors: { errorMessage: secret } }))
      .mockResolvedValueOnce(new Response(`not json ${secret}`, { status: 200 }))
      .mockRejectedValueOnce(new TypeError(secret)) as typeof fetch;
    const service = createRakutenGoodsService(cluster().instance(), fetcher);
    for (const expected of [
      { httpStatus: 400, category: "http_status" },
      { httpStatus: 200, category: "missing_items_array" },
      { httpStatus: 200, category: "invalid_json" },
      { httpStatus: null, category: "request_failed" },
    ]) {
      logger.mockClear();
      expect(await service(search)).toMatchObject({ status: "unavailable", reason: "upstream_error", items: [] });
      expect(logger).toHaveBeenCalledExactlyOnceWith("[rakuten-goods] upstream_error", expected);
      expect(JSON.stringify(logger.mock.calls)).not.toContain(search.accessKey);
      await vi.advanceTimersByTimeAsync(5_001);
    }
  });

  it("reports a stalled success body as a timeout, not invalid_json", async () => {
    const logger = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stalled = new ReadableStream({ start(controller) { controller.error(new DOMException("timeout", "TimeoutError")); } });
    const fetcher = vi.fn(async () => new Response(stalled, { status: 200 })) as unknown as typeof fetch;
    expect(await createRakutenGoodsService(cluster().instance(), fetcher)(search))
      .toMatchObject({ status: "unavailable", reason: "timeout", items: [] });
    expect(logger).not.toHaveBeenCalled();
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
