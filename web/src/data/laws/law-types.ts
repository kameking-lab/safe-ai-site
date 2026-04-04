export type LawArticle = {
  /** 法令名（正式名称） */
  law: string;
  /** 法令略称 */
  lawShort: string;
  /** 条文番号（例: 第1条、第10条第1項） */
  articleNum: string;
  /** 条文見出し（任意） */
  articleTitle: string;
  /** 条文本文 */
  text: string;
  /** 検索用キーワード */
  keywords: string[];
};
