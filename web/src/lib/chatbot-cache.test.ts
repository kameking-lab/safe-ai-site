import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetChatbotCacheForTests,
  cacheKey,
  getCacheStats,
  getCachedResponse,
  normalizeChatbotQuery,
  setCachedResponse,
} from "./chatbot-cache";

describe("normalizeChatbotQuery", () => {
  it("collapses full-width and ASCII whitespace", () => {
    expect(normalizeChatbotQuery("フォーク　リフト  運転")).toBe(
      "フォーク リフト 運転",
    );
  });

  it("trims trailing question marks and period punctuation", () => {
    expect(normalizeChatbotQuery("高所作業は？")).toBe("高所作業は");
    expect(normalizeChatbotQuery("高所作業は。")).toBe("高所作業は");
    expect(normalizeChatbotQuery("forklift training?")).toBe("forklift training");
  });

  it("lowercases roman text but leaves Japanese unchanged", () => {
    expect(normalizeChatbotQuery("Forklift TRAINING")).toBe("forklift training");
    expect(normalizeChatbotQuery("クレーン 玉掛け")).toBe("クレーン 玉掛け");
  });

  it("produces identical keys for equivalent questions", () => {
    const a = cacheKey("高所作業の資格は？ ", "all");
    const b = cacheKey("　高所作業の資格は？", "all");
    expect(a).toBe(b);
  });

  it("keeps law category as part of the key", () => {
    expect(cacheKey("Q", "all")).not.toBe(cacheKey("Q", "anzen"));
  });
});

describe("chatbot LRU cache", () => {
  beforeEach(() => {
    __resetChatbotCacheForTests();
  });

  it("returns undefined on miss and counts the miss", () => {
    expect(getCachedResponse("nope")).toBeUndefined();
    const stats = getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(1);
  });

  it("stores and returns a hit", () => {
    setCachedResponse("k1", { answer: "A" });
    const hit = getCachedResponse<{ answer: string }>("k1");
    expect(hit).toEqual({ answer: "A" });
    const stats = getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.size).toBe(1);
  });

  it("reports size and maxSize accurately", () => {
    setCachedResponse("a", 1);
    setCachedResponse("b", 2);
    const stats = getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(100);
  });

  it("overwrites existing key without growing size", () => {
    setCachedResponse("dup", "v1");
    setCachedResponse("dup", "v2");
    expect(getCachedResponse("dup")).toBe("v2");
    expect(getCacheStats().size).toBe(1);
  });
});
