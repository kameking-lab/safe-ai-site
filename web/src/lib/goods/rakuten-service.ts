import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { selectHighRatedGoodsProducts } from "./rakuten-products";
import { unavailable, type ProductResult } from "./product-result";
import type { RakutenGoodsStore } from "./rakuten-store";

const API_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const CACHE_VERSION = "goods-search-v2";
const SUCCESS_TTL_MS = 5 * 60_000;
const FAILURE_TTL_MS = 5_000;
const AUTH_FAILURE_TTL_MS = 60_000;
const MAX_FOLLOWERS_PER_INSTANCE = 32;
const FOLLOWER_WAIT_MS = 8_500;
const FOLLOWER_POLL_MS = 100;
let followers = 0;

export type GoodsSearch = {
  categoryId: string;
  featureId: string | null;
  keyword: string;
  applicationId: string;
  accessKey: string;
  affiliateId: string;
  environment: string;
};

function digest(...parts: string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function retryAfterMs(value: string | null, now: number): number {
  if (value) {
    const seconds = Number(value);
    const parsed = Number.isFinite(seconds) ? seconds * 1_000 : Date.parse(value) - now;
    if (Number.isFinite(parsed) && parsed > 0) return Math.min(Math.ceil(parsed), 7 * 24 * 60 * 60_000);
  }
  return 30_000;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The store is shared by all server instances; no process-local result cache is used. */
export function createRakutenGoodsService(store: RakutenGoodsStore | null, fetcher: typeof fetch = fetch) {
  return async function getProducts(search: GoodsSearch): Promise<ProductResult> {
    if (!store) return unavailable("upstream_error");
    const keyHash = digest(CACHE_VERSION, search.environment, API_URL, search.applicationId,
      search.accessKey, search.affiliateId, search.categoryId, search.featureId ?? "all", search.keyword);
    const applicationHash = digest("rakuten-application-v1", search.applicationId);
    try {
      const cached = await store.read(keyHash);
      if (cached.result) return cached.result;
      const token = randomUUID();
      if (!await store.claim(keyHash, token)) {
        const peerAtClaim = await store.read(keyHash);
        if (peerAtClaim.result) return peerAtClaim.result;
        // A peer owns the key. This bounded wait aggregates concurrent misses
        // without creating another upstream request or a durable queue.
        if (!peerAtClaim.pending || followers >= MAX_FOLLOWERS_PER_INSTANCE) return unavailable("rate_limited");
        followers += 1;
        try {
          const until = Date.now() + FOLLOWER_WAIT_MS;
          while (Date.now() < until) {
            await delay(FOLLOWER_POLL_MS);
            const peer = await store.read(keyHash);
            if (peer.result) return peer.result;
            if (!peer.pending) break;
          }
        } finally {
          followers -= 1;
        }
        return unavailable("rate_limited");
      }

      let result: ProductResult = unavailable("rate_limited");
      let ttlMs = FAILURE_TTL_MS;
      let gateHeld = false;
      let cooldownMs = 0;
      try {
        gateHeld = await store.acquireGate(applicationHash, token);
        if (gateHeld) {
          const url = new URL(API_URL);
          url.searchParams.set("applicationId", search.applicationId);
          url.searchParams.set("affiliateId", search.affiliateId);
          url.searchParams.set("keyword", search.keyword);
          url.searchParams.set("formatVersion", "2");
          url.searchParams.set("hits", "30");
          url.searchParams.set("sort", "-reviewCount");
          url.searchParams.set("imageFlag", "1");
          url.searchParams.set("hasReviewFlag", "1");
          url.searchParams.set("availability", "1");
          url.searchParams.set("elements", "itemCode,itemName,affiliateUrl,mediumImageUrls,reviewAverage,reviewCount,availability");
          const response = await fetcher(url, {
            headers: { accessKey: search.accessKey },
            cache: "no-store",
            signal: AbortSignal.timeout(7_000),
          });
          if (response.ok) {
            const payload: unknown = await response.json();
            if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) {
              result = unavailable("upstream_error");
            } else {
              const items = selectHighRatedGoodsProducts(payload);
              result = { status: items.length ? "ready" : "no_qualified_items", items,
                checkedAt: new Date().toISOString(), reason: null };
              ttlMs = SUCCESS_TTL_MS;
            }
          } else if (response.status === 401 || response.status === 403) {
            result = unavailable("authorization_failed");
            ttlMs = AUTH_FAILURE_TTL_MS;
          } else if (response.status === 429) {
            result = unavailable("rate_limited");
            cooldownMs = retryAfterMs(response.headers.get("retry-after"), Date.now());
            ttlMs = Math.min(cooldownMs, SUCCESS_TTL_MS);
          } else {
            result = unavailable("upstream_error");
          }
        }
      } catch (error) {
        const name = error && typeof error === "object" && "name" in error ? error.name : null;
        const timedOut = name === "TimeoutError" || name === "AbortError";
        result = unavailable(timedOut ? "timeout" : "upstream_error");
      } finally {
        // A failed database write leaves the 15-second gate lease in place.
        if (gateHeld) await store.releaseGate(applicationHash, token, cooldownMs);
        await store.complete(keyHash, token, result, ttlMs);
      }
      return result;
    } catch {
      // Shared state is mandatory. Never fall back to a process-local cache or
      // an unrestricted upstream call when PostgreSQL is unavailable.
      return unavailable("upstream_error");
    }
  };
}
