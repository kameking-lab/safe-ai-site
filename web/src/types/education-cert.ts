/** Types for the education certification database (特別教育・技能講習・職長教育) */

import type {
  EvidenceSource,
  EvidenceVerification,
} from "@/lib/evidence/types";

export type CertType =
  | "special_education" // 特別教育 (安衛法第59条第3項, 安衛則第36条)
  | "skill_training"    // 技能講習修了 (安衛法第61条, 安衛則第41条)
  | "job_chief"         // 職長教育 (安衛法第60条, 安衛則第40条)
  | "license";          // 免許 (安衛法第61条・安衛令第20条の就業制限業務。国家試験合格が必要)

/** Work category for filtering */
export type WorkCategory =
  | "construction"       // 建設業
  | "manufacturing"      // 製造業
  | "logistics"          // 運送・物流
  | "chemical"           // 化学・石油
  | "electrical"         // 電気・設備
  | "forestry"           // 林業・木材
  | "mining"             // 鉱業・採石
  | "shipbuilding"       // 造船・船舶
  | "general";           // 全業種共通

/**
 * 資格・教育の法的位置付け。
 *
 * certType（免許・技能講習等）は制度の形式であり、個別の作業について
 * 法令上必要かどうかを表さない。判定では必ずこちらと適用条件を使う。
 */
export type EducationLegalStatus =
  | "statutoryWorkRestriction"
  | "statutorySpecialEducation"
  | "statutoryAppointment"
  | "statutoryEducation"
  | "statutoryEffort"
  | "administrativeGuidance"
  | "voluntary"
  | "unverified"
  | "quarantined";

export type CraneOperationMode =
  | "floorFollowLoad"
  | "floorTravelOnly"
  | "wireless"
  | "cab"
  | "unknown";

export type QualificationConditionState =
  | "satisfied"
  | "missing"
  | "conflicting";

export type QualificationDecision =
  | "statutoryCandidate"
  | "related"
  | "unverified";

/** Qualification/certification entry */
export interface EducationCert {
  /** Unique identifier (slug) */
  id: string;
  /** Display name in Japanese */
  name: string;
  /** Type of certification */
  certType: CertType;
  /** Target work description */
  targetWork: string;
  /** Legal basis (article reference) */
  relatedLaw: string;
  /** Minimum training duration */
  duration: string;
  /** Whether periodic re-training is required */
  frequency?: string;
  /** Work categories this applies to */
  workCategories: WorkCategory[];
  /** Keywords for search/matching */
  keywords: string[];
  /** Whether a license/operator qualification is also required */
  requiresLicense?: boolean;
  /** Related cert IDs (prerequisite or co-required) */
  relatedCertIds?: string[];
  /** Effective date or last amended date (YYYY-MM-DD) */
  effectiveDate?: string;
  /** Additional notes */
  notes?: string;
  /** 法的位置付け。未登録時は unverified として扱う */
  legalStatus?: EducationLegalStatus;
  /** 個別レコードの一次資料。検索入口だけの場合は role に明記する */
  primarySources?: EvidenceSource[];
  /** URL確認と内容の人手確認を区別する */
  sourceVerification?: EvidenceVerification;
  /** 一次資料を最後に照合した基準日（YYYY-MM-DD） */
  sourceCheckedAt?: string;
}

/** Input for the certification determination engine */
export interface CertDetermineInput {
  /** Selected industry categories */
  businessTypes: WorkCategory[];
  /** Free-text or tag-based work descriptions */
  works: string[];
  /**
   * 明示的に確認した条件。自由記述からの推定だけでは
   * conditionsConfirmed=true とみなさない。
   */
  context?: {
    liftingCapacityTon?: number;
    craneOperationMode?: CraneOperationMode;
    /** 人が入力条件を確認した場合だけ true */
    conditionsConfirmed?: boolean;
    /** 判定基準日（YYYY-MM-DD）。省略時はデータ確認基準日 */
    referenceDate?: string;
  };
}

/** Result item from determination */
export interface RequiredCertResult {
  cert: EducationCert;
  /** Why this cert is required */
  matchReason: string;
  /**
   * 後方互換用の表示優先度。
   * required は一次資料を人手確認済みで、明示条件が全て確定した場合だけ。
   */
  priority: "required" | "recommended";
  /** 「法定制度の候補」と「推奨・未確認」を分離する */
  decision: QualificationDecision;
  /** 適用条件の充足状態 */
  conditionState: QualificationConditionState;
  /** 帳票・就業判断へ転記する前に人が確認すべきか */
  humanReviewRequired: boolean;
}

/** Result of missing cert check */
export interface MissingCertResult {
  cert: EducationCert;
  matchReason: string;
}
