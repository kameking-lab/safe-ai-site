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
  /**
   * 号番号マップ（任意）。条文に列挙される号（一・二・三・…）と
   * 対象業務・対象事項の対応を明示し、AI が号番号をハルシネーションしないよう
   * プロンプトに添付する。キーは漢数字表記（例: "六"）、値は当該号の主題（例: "フォークリフト"）。
   */
  itemNumberMap?: Record<string, string>;
};
