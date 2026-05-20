/**
 * In-memory LRU cache for /api/chatbot responses.
 *
 * Why: Gemini calls dominate latency and cost on the chatbot route. Many
 * users ask the same canonical questions ("フォークリフトの資格は？",
 * "高所作業の墜落防止" 等), and the answer is fully deterministic once
 * the question + lawCategory are fixed (we don't pass history into cache —
 * see `cacheKey` below). A small process-local LRU is the simplest way to
 * remove the duplicate Gemini call without standing up Redis/KV.
 *
 * Constraints:
 *   - max 100 entries (Vercel functions are short-lived; bigger doesn't help)
 *   - TTL 24h (regulations don't change intra-day; we want fresh-enough)
 *   - normalize key: whitespace collapse + lowercase + trim trailing punct
 *   - history-bearing requests bypass the cache (per-conversation context)
 */

export type CacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  size: number;
  maxSize: number;
  ttlMs: number;
};

type Entry<V> = {
  key: string;
  value: V;
  expiresAt: number;
};

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Normalize a chatbot question into a stable cache key.
 *
 * - collapse all whitespace (incl. full-width spaces) to single ASCII space
 * - lowercase (Japanese kana/kanji unaffected; helps roman text)
 * - trim trailing punctuation (？?！!。、.,) so "X?" and "X" share a key
 */
export function normalizeChatbotQuery(raw: string): string {
  return raw
    .replace(/[\s　]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[？?！!。、.,\s]+$/u, "");
}

/** Cache key combines normalized query + law category. */
export function cacheKey(message: string, lawCategory: string): string {
  return `${lawCategory}::${normalizeChatbotQuery(message)}`;
}

class LruTtlCache<V> {
  private readonly store = new Map<string, Entry<V>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;

  constructor(
    private readonly maxSize: number = DEFAULT_MAX_SIZE,
    private readonly ttlMs: number = DEFAULT_TTL_MS,
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.expirations += 1;
      this.misses += 1;
      return undefined;
    }
    // Bump recency: re-insert at the tail of the iteration order.
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.evictions += 1;
      }
    }
    this.store.set(key, {
      key,
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expirations: this.expirations,
      size: this.store.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

// Module-level singleton — shared across requests within a single function
// instance. Vercel serverless instances are short-lived, so a cross-instance
// cache would need KV; this remains an explicit in-process optimization.
const chatbotCache = new LruTtlCache<unknown>(DEFAULT_MAX_SIZE, DEFAULT_TTL_MS);

export function getCachedResponse<V>(key: string): V | undefined {
  return chatbotCache.get(key) as V | undefined;
}

export function setCachedResponse<V>(key: string, value: V): void {
  chatbotCache.set(key, value);
}

export function getCacheStats(): CacheStats {
  return chatbotCache.stats();
}

/** Exposed for tests. Do not call from production code. */
export function __resetChatbotCacheForTests(): void {
  chatbotCache.clear();
}
