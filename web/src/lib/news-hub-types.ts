/**
 * 新着ハブの型・ラベル・純粋ヘルパー（データ非依存）。
 * クライアントコンポーネントから安全に import できるよう、データ読み込みを伴う
 * news-hub.ts から分離する。
 */

export type NewsHubCategory = "law-revision" | "accident" | "notice" | "media";

export type NewsHubItem = {
  id: string;
  category: NewsHubCategory;
  title: string;
  summary: string;
  /** 並び替え・新着判定用の日付 YYYY-MM-DD */
  date: string;
  /** 一次情報（公式）への外部リンク */
  url: string;
  /** サイト内の該当機能への導線 */
  internalHref?: string;
  /** 補助バッジ（法改正の施行前/済 等） */
  badge?: string;
};

export const NEWS_HUB_CATEGORY_LABEL: Record<NewsHubCategory, string> = {
  "law-revision": "法改正",
  accident: "事故速報",
  notice: "通達・告示",
  media: "報道",
};

/** 過去 days 日以内かを判定（新着バッジ用）。未来日は新着扱いしない。 */
export function isRecent(date: string, days = 30, now: Date = new Date()): boolean {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return now.getTime() - d <= days * 24 * 60 * 60 * 1000 && d <= now.getTime();
}
