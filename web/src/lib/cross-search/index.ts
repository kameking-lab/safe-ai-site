/**
 * サイト横断検索（柱C-2）の公開エントリ。
 * 純データ層＋純関数のみ（UI なし）。
 *
 * 実データ統合インデックスの構築は、両UI（/search・⌘K）が実際に読む唯一の正本
 * {@link buildSearchIndex}（`@/lib/search-index`）に一本化している。かつて本フォルダにも
 * 並行して `buildCrossSearchIndex`（build.ts）が存在したが、どのUIからも参照されず
 * （search-index.ts が revision/faq/glossary/equipment/article/教育コース まで含む上位集合として
 * 稼働）、編集してもUIに反映されない“死んだ並行索引”＝ドリフトの罠だったため撤去した。
 * ここが公開するのは純関数（{@link searchCrossIndex} 等）と型・ヘルパーのみ。
 */
export type { CrossSearchCategory, CrossSearchItem } from './types';
export { CROSS_SEARCH_CATEGORY_LABEL } from './types';
export { searchCrossIndex, type CrossSearchOptions, type ScorableItem } from './score';
export { normalizeArticleQuery } from './article-query';
export { EGOV_LAW_SEARCH_URL, egovHandoffQuery, egovArticleAnchor, type EgovArticleAnchor } from './egov-fallback';
export { expandLawAliases } from './law-alias';
export { chemicalDetailUrl, hasChemicalDetailPage } from './chemical-detail-url';
