/**
 * サイト全体で表示する KPI 数字を一元管理。
 * ページごとに別々にハードコードすると不整合が生じるため、ここから参照すること。
 */
export const SITE_STATS = {
  /** 厚労省 職場のあんぜんサイト 事故データベース収録件数 */
  accidentDbCount: "504,415",
  /** 死亡労災件数（令和5年・建設業）厚労省統計 */
  fatalDisastersR5: "1,389",
  /** RAG 検索対応の法令条文データ数（compact.json total: 1,127）*/
  lawArticleCount: "1,127",
  /** 対応教育の種類数（特別教育・法定・労働衛生、要相談含む） */
  specialEdKinds: "12+",
} as const;
