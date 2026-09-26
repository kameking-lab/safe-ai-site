import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { selectHighRatedGoodsProducts } from "./rakuten-products";
import { unavailable, type ProductResult } from "./product-result";
import type { RakutenGoodsStore } from "./rakuten-store";
import { SITE_URL } from "@/lib/seo-metadata";

const API_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
// 楽天2026 APIはアプリの「許可されたWebサイト」とReferer/Originを照合する。
// サーバー側fetchは既定で両方とも送らないため、自サイトの正規URLだけを明示する。
const REQUEST_CONTEXT_HEADERS = { Referer: `${SITE_URL}/`, Origin: SITE_URL } as const;
const CACHE_VERSION = "goods-search-v3";
const SUCCESS_TTL_MS = 5 * 60_000;
const FAILURE_TTL_MS = 5_000;
const AUTH_FAILURE_TTL_MS = 60_000;
const MAX_FOLLOWERS_PER_INSTANCE = 32;
const FOLLOWER_WAIT_MS = 8_500;
const FOLLOWER_POLL_MS = 100;
const MAX_ERROR_BODY_BYTES = 2_048;
const AUTH_PROBE_TTL_MS = 24 * 60 * 60_000;
const AUTH_PROBE_GATE_WAIT_MS = 4_000;
const RAKUTEN_AUTH_ERROR_CODES = new Set([
  "access_denied", "forbidden", "invalid_access_key", "invalid_application_id",
  "invalid_credentials", "invalid_token", "not_authorized", "unauthorized",
  "wrong_parameter",
]);
// Rakuten 2026 constants such as REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING.
// Letters and underscores only, so a credential or URL cannot pass through.
const RAKUTEN_REQUEST_CONTEXT_CODE = /^request_context_[a-z_]{1,80}$/;

/** Maps an upstream error string to a fixed code; anything else is "unknown". */
function authErrorCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase().replace(/ /g, "_");
  return RAKUTEN_AUTH_ERROR_CODES.has(code) || RAKUTEN_REQUEST_CONTEXT_CODE.test(code) ? code : null;
}
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

function searchUrl(search: GoodsSearch): URL {
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
  return url;
}

async function readAuthErrorCode(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "unknown";
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    while (bytes <= MAX_ERROR_BODY_BYTES) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_ERROR_BODY_BYTES) return "unknown";
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object") return "unknown";
    // 2026 API: {"errors":{"errorCode":403,"errorMessage":"..."}}; legacy: {"error":"..."}.
    const errors = "errors" in parsed && parsed.errors && typeof parsed.errors === "object" ? parsed.errors : null;
    const message = errors && "errorMessage" in errors ? errors.errorMessage : null;
    return authErrorCode(message) ?? authErrorCode("error" in parsed ? parsed.error : null) ?? "unknown";
  } catch {
    return "unknown";
  } finally {
    void reader.cancel().catch(() => undefined);
  }
}

/** The store is shared by all server instances; no process-local result cache is used. */
export function createRakutenGoodsService(store: RakutenGoodsStore | null, fetcher: typeof fetch = fetch) {
  async function probeQueryAuthorization(search: GoodsSearch, applicationHash: string,
    headerStatus: number, headerCode: string): Promise<void> {
    if (!store || search.environment !== "production" || process.env.VERCEL_ENV !== "production") return;
    // One diagnostic attempt per credential version, across all instances.
    // The marker contains only a digest and expires without a cleanup job.
    const probeKey = digest("rakuten-auth-header-query-probe-v1", search.applicationId, search.accessKey);
    const token = randomUUID();
    try {
      if (!await store.claim(probeKey, token)) return;
      let gateHeld = false;
      let cooldownMs = 0;
      try {
        const until = Date.now() + AUTH_PROBE_GATE_WAIT_MS;
        while (Date.now() < until && !gateHeld) {
          gateHeld = await store.acquireGate(applicationHash, token);
          if (!gateHeld) await delay(200);
        }
        if (!gateHeld) return;
        const url = searchUrl(search);
        url.searchParams.set("accessKey", search.accessKey);
        const response = await fetcher(url, {
          headers: { ...REQUEST_CONTEXT_HEADERS },
          cache: "no-store",
          signal: AbortSignal.timeout(7_000),
        });
        const queryCode = response.status === 401 || response.status === 403
          ? await readAuthErrorCode(response) : null;
        if (response.status === 429) cooldownMs = retryAfterMs(response.headers.get("retry-after"), Date.now());
        if (response.status !== 401 && response.status !== 403) {
          void response.body?.cancel().catch(() => undefined);
        }
        // No request URL, headers, raw body, identifiers, or credentials leave this process.
        console.warn("[rakuten-goods] auth_transport_probe", {
          headerStatus, headerCode, queryStatus: response.status, queryCode,
        });
      } catch {
        // A network failure has no safe status/code to report. The marker
        // still prevents unbounded retries on later public page visits.
      } finally {
        if (gateHeld) await store.releaseGate(applicationHash, token, cooldownMs);
        await store.complete(probeKey, token, unavailable("authorization_failed"), AUTH_PROBE_TTL_MS);
      }
    } catch {
      // Shared-state failure never falls back to an unthrottled probe.
    }
  }

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
      let authFailure: { status: number; code: string } | null = null;
      try {
        gateHeld = await store.acquireGate(applicationHash, token);
        if (gateHeld) {
          const url = searchUrl(search);
          const response = await fetcher(url, {
            headers: { ...REQUEST_CONTEXT_HEADERS, accessKey: search.accessKey },
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
            const code = await readAuthErrorCode(response);
            authFailure = { status: response.status, code };
            // Only a fixed error code leaves this process. Descriptions may
            // echo credentials or request URLs and are never logged.
            console.warn("[rakuten-goods] authorization_failed", {
              httpStatus: response.status,
              errorCode: code,
            });
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
      if (authFailure) await probeQueryAuthorization(search, applicationHash,
        authFailure.status, authFailure.code);
      return result;
    } catch {
      // Shared state is mandatory. Never fall back to a process-local cache or
      // an unrestricted upstream call when PostgreSQL is unavailable.
      return unavailable("upstream_error");
    }
  };
}
