export type SignageNewsEngine = "google" | "yahoo" | "duckduckgo";

const STORAGE_KEY = "signage-news-engine";

export function getStoredNewsEngine(): SignageNewsEngine {
  if (typeof window === "undefined") return "google";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "yahoo" || v === "duckduckgo" || v === "google") return v;
  return "google";
}

export function setStoredNewsEngine(engine: SignageNewsEngine) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, engine);
}

/** 見出し＋キーワードでニュース検索結果へ（個別記事URLの捏造を避ける） */
export function buildSignageNewsUrl(engine: SignageNewsEngine, title: string, keywordExtra?: string): string {
  const q = encodeURIComponent([title, keywordExtra ?? "労働災害"].filter(Boolean).join(" "));
  if (engine === "yahoo") {
    return `https://news.yahoo.co.jp/search?p=${q}`;
  }
  if (engine === "duckduckgo") {
    return `https://duckduckgo.com/?q=${q}&iar=news&ia=news`;
  }
  return `https://news.google.com/search?q=${q}&hl=ja&gl=JP&ceid=JP%3Aja`;
}
