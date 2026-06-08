/**
 * 新着ハブの型・ラベル・純粋ヘルパー（データ非依存）。
 * クライアントコンポーネントから安全に import できるよう、データ読み込みを伴う
 * news-hub.ts から分離する。
 */

export type NewsHubCategory = "law-revision" | "accident" | "notice" | "media" | "serious-case";

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
  /**
   * 関連業種タグ（法改正のみ付与＝deriveIndustryTags の結果。IndustryTag 値の配列）。
   * 空配列 or 未定義は「全業種向け（特定業種に限定されない）」を意味する。
   * 業種別メール配信のセグメント（filterItemsForIndustry）に使う。
   */
  industries?: string[];
};

export const NEWS_HUB_CATEGORY_LABEL: Record<NewsHubCategory, string> = {
  "law-revision": "法改正",
  accident: "事故速報",
  notice: "通達・告示",
  media: "報道",
  "serious-case": "重大災害事例",
};

/** 過去 days 日以内かを判定（新着バッジ用）。未来日は新着扱いしない。 */
export function isRecent(date: string, days = 30, now: Date = new Date()): boolean {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return now.getTime() - d <= days * 24 * 60 * 60 * 1000 && d <= now.getTime();
}

/**
 * 「新着」判定（前回閲覧以降）。lastVisit があればそれより新しい日付、無ければ直近30日。
 * バッジ表示・「新着のみ」フィルタ・件数表示で同一基準を使うための共通関数。
 */
export function isNewSince(item: NewsHubItem, lastVisit: string | null, now: Date = new Date()): boolean {
  return lastVisit ? item.date > lastVisit : isRecent(item.date, 30, now);
}

/**
 * 業種フィルタの判定。
 * - industries 未定義/空（＝事故速報・通達・報道など業種非依存、または全業種向けの法改正）は常に表示。
 * - 特定業種にだけタグ付いた法改正は、選択業種を含むときだけ表示。
 * deriveIndustryTags は汎用改正に全業種タグを付すため、汎用法改正もどの業種選択でも表示される。
 */
export function newsItemMatchesIndustry(item: NewsHubItem, industry: string): boolean {
  if (!item.industries || item.industries.length === 0) return true;
  return item.industries.includes(industry);
}

export type NewsHubFilter = {
  category: NewsHubCategory | "all";
  industry: string | "all";
  newOnly: boolean;
  lastVisit: string | null;
};

/** 新着ハブの一覧をカテゴリ・業種・新着で絞り込む純粋関数（UI と同一基準）。 */
export function filterNewsHubItems(
  items: NewsHubItem[],
  { category, industry, newOnly, lastVisit }: NewsHubFilter,
  now: Date = new Date(),
): NewsHubItem[] {
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (industry !== "all" && !newsItemMatchesIndustry(item, industry)) return false;
    if (newOnly && !isNewSince(item, lastVisit, now)) return false;
    return true;
  });
}
