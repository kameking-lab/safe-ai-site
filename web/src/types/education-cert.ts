/** Types for the education certification database (特別教育・技能講習・職長教育) */

export type CertType =
  | "special_education" // 特別教育 (安衛法第59条第3項, 安衛則第36条)
  | "skill_training"    // 技能講習修了 (安衛法第61条, 安衛則第41条)
  | "job_chief";        // 職長教育 (安衛法第60条, 安衛則第40条)

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
}

/** Input for the certification determination engine */
export interface CertDetermineInput {
  /** Selected industry categories */
  businessTypes: WorkCategory[];
  /** Free-text or tag-based work descriptions */
  works: string[];
}

/** Result item from determination */
export interface RequiredCertResult {
  cert: EducationCert;
  /** Why this cert is required */
  matchReason: string;
  /** Priority: required = legally mandated, recommended = best practice */
  priority: "required" | "recommended";
}

/** Result of missing cert check */
export interface MissingCertResult {
  cert: EducationCert;
  matchReason: string;
}
