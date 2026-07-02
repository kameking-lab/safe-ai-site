/**
 * サイト横断検索（柱C-2）の公開エントリ。
 * 純データ層＋純関数のみ（UI なし）。
 */
export type { CrossSearchCategory, CrossSearchItem } from './types';
export { CROSS_SEARCH_CATEGORY_LABEL } from './types';
export { buildCrossSearchIndex, __resetCrossSearchIndexCache } from './build';
export { searchCrossIndex, type CrossSearchOptions, type ScorableItem } from './score';
export { normalizeArticleQuery } from './article-query';
export { EGOV_LAW_SEARCH_URL, egovHandoffQuery } from './egov-fallback';
