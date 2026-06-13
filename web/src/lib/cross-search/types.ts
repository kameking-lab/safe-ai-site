/**
 * サイト横断検索（柱C-2）の共通型。
 *
 * チャットボットの lexical 基盤（正規化＋シノニム）を流用し、条文・通達・判例・
 * 標識・主要機能・教育資格DB・化学物質・事故事例を 1 本のインデックスに集約する。
 * この層は純データ／純関数のみ（UI なし）。UI（ヘッダー検索・/search）は C-2-2 / C-2-3。
 */

/** 横断検索の対象カテゴリ。表示順・優先度の意味も持つ（CATEGORY_PRIORITY 参照）。 */
export type CrossSearchCategory =
  | 'feature' // 主要機能・ページ
  | 'education' // 教育資格DB（特別教育・技能講習・職長・免許）
  | 'law' // 条文
  | 'notice' // 通達・告示・指針
  | 'precedent' // 労災・労働判例
  | 'sign' // 安全標識
  | 'chemical' // 化学物質
  | 'accident'; // 事故事例

/** 横断検索インデックスの 1 レコード。 */
export interface CrossSearchItem {
  /** 一意 ID（カテゴリ接頭辞付き。例: "edu-cert-se-36-3-arch"） */
  id: string;
  /** 表示タイトル（最重要のマッチ対象） */
  title: string;
  /** 補足メタ（出典・条番号・分野など。1 行表示） */
  subtitle: string;
  /**
   * 追加のマッチ用キーワード（title/subtitle に出ない別名・分類ラベル・関連語）。
   * 例: 教育資格には区分ラベル「特別教育」、条文には法令名・条番号を含める。
   */
  keywords: string[];
  /** カテゴリ */
  category: CrossSearchCategory;
  /** 遷移先 URL（実在ルートのみ＝幽霊URL禁止） */
  url: string;
}

/** カテゴリの日本語ラベル（UI ロールアウト時に共有）。 */
export const CROSS_SEARCH_CATEGORY_LABEL: Record<CrossSearchCategory, string> = {
  feature: '機能',
  education: '教育資格',
  law: '条文',
  notice: '通達',
  precedent: '判例',
  sign: '標識',
  chemical: '化学物質',
  accident: '事故',
};
