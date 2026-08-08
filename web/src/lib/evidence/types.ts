export const INFORMATION_KIND_LABELS = {
  law: "法律",
  cabinetOrder: "政令",
  ministerialOrdinance: "省令",
  notification: "告示",
  circular: "通達",
  guidance: "指針",
  guideline: "ガイドライン",
  precedent: "判例",
  officialAccident: "公式事故情報",
  curatedAccident: "編集済み事例",
  syntheticCase: "syntheticモデルケース",
  aiSummary: "AI要約",
  estimate: "推定値",
  measurement: "実測値",
  siteCommentary: "サイト独自解説",
} as const;

export type InformationKind = keyof typeof INFORMATION_KIND_LABELS;

export const FRESHNESS_LABELS = {
  current: "現行",
  stale: "期限超過・stale",
  unknown: "鮮度未確認",
  unavailable: "取得不能",
  quarantined: "隔離中",
} as const;

export type EvidenceFreshness = keyof typeof FRESHNESS_LABELS;

export const VERIFICATION_LABELS = {
  humanVerified: "人手で内容確認済み",
  primarySourceMatched: "一次資料との照合済み",
  sourceLocated: "参照URL確認済み・内容確認待ち",
  pending: "人手確認待ち",
  unverified: "未確認",
  rejected: "不採用",
  quarantined: "隔離中",
} as const;

export type EvidenceVerification = keyof typeof VERIFICATION_LABELS;

export type EvidenceSource = {
  /** source-registry.ts のID。個別資料が未登録なら省略する。 */
  registryId?: string;
  title: string;
  publisher?: string;
  documentNumber?: string | null;
  url: string;
  /** 「個別事故の原記録」「検索入口」等、根拠として使える範囲。 */
  role?: string;
};

export type EvidenceCorrection = {
  correctedAt: string;
  summary: string;
  previousState?: string;
  affectedArea?: string;
};

/**
 * 法令・事故・資格・化学物質・気象・AIを同じ確認語彙で扱う公開用モデル。
 * 不明値を空文字で埋めず null にし、UIでは必ず「未登録／確認待ち」と表示する。
 */
export type EvidenceRecord = {
  id: string;
  informationKind: InformationKind;
  primarySources: EvidenceSource[];
  secondarySources: EvidenceSource[];
  legalPosition: string | null;
  asOf: string | null;
  promulgatedAt: string | null;
  effectiveAt: string | null;
  retrievedAt: string | null;
  humanReviewedAt: string | null;
  dataVersion: string | null;
  scope: string;
  exclusions: string[];
  aiGenerated: boolean;
  humanReviewRequired: boolean;
  freshness: EvidenceFreshness;
  verification: EvidenceVerification;
  supersededBy: EvidenceSource | null;
  corrections: EvidenceCorrection[];
};

export const SOURCE_REGISTRY_STATUS_LABELS = {
  humanVerified: "内容を人手確認済み",
  snapshotConfirmed: "公開URL・取得時点のbyte hash確認済み・内容確認待ち",
  urlConfirmed: "公開URL確認済み・内容確認待ち",
  pending: "確認待ち",
  stale: "再確認期限超過",
  quarantined: "隔離中",
  unavailable: "取得不能",
} as const;

export type SourceRegistryStatus = keyof typeof SOURCE_REGISTRY_STATUS_LABELS;

export type SourceRegistryRecord = {
  id: string;
  officialName: string;
  publisher: string;
  documentNumber: string | null;
  url: string;
  retrievedAt: string;
  verifiedAt: string | null;
  hash: string | null;
  successorUrl: string | null;
  status: SourceRegistryStatus;
  reviewer: string | null;
  appliesTo: string[];
  disclosure: "public" | "internal";
  note: string;
};
