/**
 * 公開前の法令・教育内容レビューで、一次資料との整合を確認できなかった記事。
 * データは訂正作業の証跡として保持するが、詳細、一覧、検索、sitemap、JSON-LDへ出さない。
 */
export const QUARANTINED_ARTICLE_SLUGS = new Set([
  "chemical-ra-mandatory-substances",
  "elearning-tokubetsu-12-types",
  "fall-prevention-checklist-construction",
  "freelance-rosai-2024",
  "fullharness-2022-revision",
  "ky-paperless-implementation",
  "scaffold-3rd-rail-2024",
  "stress-check-50-employee",
  "vibration-isohazard-forestry",
]);

export function isArticleQuarantined(slug: string): boolean {
  return QUARANTINED_ARTICLE_SLUGS.has(slug);
}
