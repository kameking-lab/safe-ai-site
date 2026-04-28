/**
 * UGC（ユーザー投稿）の型定義
 */

export type UgcCategory = "hiyari" | "question" | "tips";

export const UGC_CATEGORY_LABELS: Record<UgcCategory, string> = {
  hiyari: "ヒヤリハット",
  question: "質問",
  tips: "現場のTips",
};

export const UGC_INDUSTRY_OPTIONS = [
  { value: "construction", label: "建設・土木" },
  { value: "manufacturing", label: "製造・化学" },
  { value: "logistics", label: "物流・運輸" },
  { value: "care", label: "医療・福祉・介護" },
  { value: "forestry", label: "林業・農業・漁業" },
  { value: "other", label: "その他" },
] as const;

export type UgcIndustry = (typeof UGC_INDUSTRY_OPTIONS)[number]["value"];

export type UgcStatus = "pending" | "approved" | "rejected" | "needs_review";

export type UgcAuditFlags = {
  ngWords: string[];
  spamScore: number; // 0-1
  piiDetected: string[]; // ["email", "phone", "name"]
  recommendScore: number; // 0-100
  recommendation: "auto_approve" | "needs_review" | "auto_reject";
  reasons: string[];
};

export type UgcSubmission = {
  id: string;
  createdAt: string; // ISO
  category: UgcCategory;
  industry: UgcIndustry;
  title: string;
  body: string; // 個人情報マスキング後
  bodyOriginal: string; // 監査用に原文も保持（管理画面のみ）
  authorAlias: string; // 匿名表示用ハンドル
  status: UgcStatus;
  audit: UgcAuditFlags;
  supervisorComment?: string;
  relatedNotices?: string[];
};

export type UgcSubmissionPublic = Omit<UgcSubmission, "bodyOriginal" | "audit"> & {
  audit?: never;
};

export function toPublicSubmission(s: UgcSubmission): UgcSubmissionPublic {
  // 公開用は原文と監査情報を除外
  const { bodyOriginal: _bodyOriginal, audit: _audit, ...rest } = s;
  void _bodyOriginal;
  void _audit;
  return rest as UgcSubmissionPublic;
}
