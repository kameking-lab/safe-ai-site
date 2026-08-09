import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

describe("service worker privacy boundary", () => {
  it("does not precache the account page", () => {
    const precache = source.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(precache).not.toContain('"/account"');
    expect(precache).not.toContain('"/ky",');
    expect(precache).not.toContain('"/ky/paper"');
    expect(precache).not.toContain('"/law-search"');
    expect(precache).not.toContain('"/chatbot"');
    expect(source).toContain('credentials: "omit"');
    expect(source).toContain('!res.headers.has("set-cookie")');
  });

  it("routes APIs and private pages through network-only handling", () => {
    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain('url.pathname.startsWith("/account")');
    expect(source).toContain("event.respondWith(networkOnly(request))");
  });

  it("bumps the cache version so previously cached private responses are purged", () => {
    expect(source).toContain('const CACHE_NAME = "anzen-ai-v7"');
    expect(source).toContain('key.startsWith("anzen-ai-")');
  });

  it("does not persist image optimizer output and limits push navigation to same-origin paths", () => {
    const cacheFirstCondition =
      source.match(
        /\/\/ _next\/static[\s\S]*?if \(([\s\S]*?)\) \{\s*event\.respondWith\(cacheFirst/,
      )?.[1] ?? "";
    expect(cacheFirstCondition).not.toContain('url.pathname.startsWith("/_next/image/")');
    expect(source).toContain("safeNotificationPath");
    expect(source).toContain('value.startsWith("//")');
    expect(source).toContain("parsed.origin !== self.location.origin");
  });

  it("serves an explicit offline shell instead of cached private or legal HTML", () => {
    const navigationBody =
      source.match(/async function navigationNetworkFirst[\s\S]*?\r?\n}\r?\n/)?.[0] ?? "";
    expect(navigationBody).toContain("caches.match(OFFLINE_URL)");
    expect(navigationBody).not.toContain("caches.match(request)");
  });

  it("caches only exact public safety-learning routes after a successful public HTML response", () => {
    expect(source).toContain("PUBLIC_SAFETY_LEARNING_PATH");
    expect(source).toContain('url.search === ""');
    expect(source).toContain("publicLearningNavigationNetworkFirst(request, url)");
    const learningBody =
      source.match(/async function publicLearningNavigationNetworkFirst[\s\S]*?\r?\n}\r?\n/)?.[0] ?? "";
    expect(learningBody).toContain("caches.match(cacheKey)");
    expect(learningBody).toContain("cache.put(cacheKey, response.clone())");
    expect(source).toContain('credentials: "omit"');
    expect(source).toContain('!response.headers.has("set-cookie")');
    expect(source).toContain('/\\b(?:no-store|private)\\b/i');
  });
});
