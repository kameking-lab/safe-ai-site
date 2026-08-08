import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetChatbotCacheForTests,
  CHATBOT_CACHE_SCHEMA_VERSION,
  cacheKey,
  chatbotAnswerDateJst,
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
    const now = new Date("2026-08-02T03:00:00Z");
    const a = cacheKey("高所作業の資格は？ ", "all", now, "source-a");
    const b = cacheKey("　高所作業の資格は？", "all", now, "source-a");
    expect(a).toBe(b);
  });

  it("does not retain the normalized question text in the process-local key", () => {
    const question = "足場の手すり高さは？";
    const key = cacheKey(
      question,
      "all",
      new Date("2026-08-02T03:00:00Z"),
      "source-a",
    );

    expect(key).not.toContain(question);
    expect(key).not.toContain(normalizeChatbotQuery(question));
  });

  it("keeps law category as part of the key", () => {
    const now = new Date("2026-08-02T03:00:00Z");
    expect(cacheKey("Q", "all", now)).not.toBe(
      cacheKey("Q", "anzen", now),
    );
  });

  it("rotates at JST midnight even while the 24-hour entry remains live", () => {
    const beforeMidnight = new Date("2026-08-02T14:59:59.999Z");
    const afterMidnight = new Date("2026-08-02T15:00:00.000Z");

    expect(chatbotAnswerDateJst(beforeMidnight)).toBe("2026-08-02");
    expect(chatbotAnswerDateJst(afterMidnight)).toBe("2026-08-03");
    expect(cacheKey("同じ質問", "all", beforeMidnight, "source-a")).not.toBe(
      cacheKey("同じ質問", "all", afterMidnight, "source-a"),
    );
  });

  it("separates schema and verified-source generations", () => {
    const now = new Date("2026-08-02T03:00:00Z");
    const current = cacheKey("同じ質問", "all", now, "source-b");

    expect(current).toContain(CHATBOT_CACHE_SCHEMA_VERSION);
    expect(current).not.toContain("evidence-v2");
    expect(current).not.toBe(cacheKey("同じ質問", "all", now, "source-a"));
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
