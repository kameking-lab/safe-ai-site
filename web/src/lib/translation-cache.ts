/**
 * 翻訳結果のクライアントサイド・キャッシュ
 *
 * 目的: 同じ記事を複数回開いた時にGemini APIへ無駄に投げない。
 * - 第1段: メモリキャッシュ（同セッション内）
 * - 第2段: localStorage（リロード後も生存。30日でTTL切れ）
 *
 * キーは `${resource}:${id}:${lang}` 形式。
 */

export type CacheEntry = {
  text: string;
  ts: number; // unix ms
};

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "anzen-tr:";
const memory = new Map<string, CacheEntry>();

function cacheKey(resource: string, id: string, lang: string): string {
  return `${resource}:${id}:${lang}`;
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.ts < TTL_MS;
}

export function getCached(
  resource: string,
  id: string,
  lang: string
): string | null {
  const key = cacheKey(resource, id, lang);
  const mem = memory.get(key);
  if (mem && isFresh(mem)) return mem.text;

  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!isFresh(parsed)) {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    memory.set(key, parsed);
    return parsed.text;
  } catch {
    return null;
  }
}

export function setCached(
  resource: string,
  id: string,
  lang: string,
  text: string
): void {
  const key = cacheKey(resource, id, lang);
  const entry: CacheEntry = { text, ts: Date.now() };
  memory.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage quota exceeded などは黙って捨てる
  }
}

export function clearTranslationCache(): void {
  memory.clear();
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // noop
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "tl", label: "Tagalog", flag: "🇵🇭" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
