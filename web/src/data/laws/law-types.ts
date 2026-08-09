export type LawAmendmentHistoryEntry = {
  /** e-Gov revision identifier of the exact consolidated text snapshot. */
  revisionId: string;
  /** Official number of the amending act/order recorded by e-Gov. */
  amendmentLawNumber: string;
  /** Promulgation date of that amendment (YYYY-MM-DD). */
  promulgatedOn: string;
  /** Enforcement date recorded for that amendment (YYYY-MM-DD). */
  effectiveOn?: string;
  /** Enforcement state retained in the committed revision snapshot. */
  status?: "enforced" | "upcoming" | "undetermined";
  /** Official current-law page used by both committed snapshots. */
  sourceUrl: string;
};

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
  /** Provenance class for exact text copied from an official source. */
  sourceKind?:
    | "egov-fulltext-snapshot"
    | "mhlw-official-primary"
    | "government-official-primary";
  /** Primary-source law page. */
  sourceUrl?: string;
  /** e-Gov law identifier used by the snapshot. */
  sourceLawId?: string;
  /** Revision identifier returned by the e-Gov API. */
  sourceRevisionId?: string;
  /**
   * Promulgation date of the amendment represented by `sourceRevisionId`.
   * This is not the original law's promulgation date. It remains undefined
   * unless the committed e-Gov revision snapshot matches the exact revision.
   */
  amendmentPromulgatedOn?: string;
  /** Verified amendment records retained locally; not an exhaustive history. */
  amendmentHistory?: readonly LawAmendmentHistoryEntry[];
  /** Explicitly distinguishes a dated historical version from the current snapshot. */
  sourceVersionKind?: "current" | "historical";
  /** First day covered by a historical version (YYYY-MM-DD). */
  sourceValidFrom?: string;
  /** Last day covered by a historical version (YYYY-MM-DD). */
  sourceValidTo?: string;
  /** Snapshot acquisition time. This is not a human review time. */
  sourceFetchedAt?: string;
  /** SHA-256 of the complete snapshot, or of the normalized official excerpt. */
  sourceHash?: string;
  /** SHA-256 of the selected canonical article object. */
  contentHash?: string;
  /** Integrity verification only; does not assert applicability or legal review. */
  verificationStatus?: "snapshot-hash-verified" | "primary-source-verified";
  /** Human legal review is tracked separately from hash verification. */
  humanReviewStatus?: "not-reviewed" | "reviewed";
};
