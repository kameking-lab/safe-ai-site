/**
 * Education certification determination engine.
 * Matches work descriptions and industry types to required certifications.
 */

import type {
  EducationCert,
  WorkCategory,
  CertDetermineInput,
  RequiredCertResult,
  MissingCertResult,
} from "@/types/education-cert";
import { ALL_CERTS } from "@/data/education-rules";

/** Keyword match: returns score 0..N based on how many keywords hit */
function keywordScore(cert: EducationCert, works: string[]): number {
  const haystack = works.join(" ").toLowerCase();
  return cert.keywords.filter((kw) => haystack.includes(kw.toLowerCase())).length;
}

/** Category match: true if cert covers at least one of the requested categories */
function categoryMatch(cert: EducationCert, businessTypes: WorkCategory[]): boolean {
  if (cert.workCategories.includes("general")) return true;
  return businessTypes.some((bt) => cert.workCategories.includes(bt));
}

/**
 * Determine required certifications based on industry and work descriptions.
 * Returns results sorted by: required first, then by match score descending.
 */
export function determineRequiredCerts(
  input: CertDetermineInput,
  options?: { minScore?: number }
): RequiredCertResult[] {
  const { businessTypes, works } = input;
  const minScore = options?.minScore ?? 1;
  const results: RequiredCertResult[] = [];

  for (const cert of ALL_CERTS) {
    const score = keywordScore(cert, works);
    const catMatch = categoryMatch(cert, businessTypes);

    if (score < minScore && !catMatch) continue;
    if (score === 0 && catMatch && works.length > 0) continue; // category only, skip if works were specified

    const matchReason = buildMatchReason(cert, works, businessTypes, score);
    const priority =
      cert.certType === "special_education" || cert.certType === "skill_training" || cert.certType === "license"
        ? "required"
        : "recommended";

    results.push({ cert, matchReason, priority });
  }

  return results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "required" ? -1 : 1;
    const scoreA = keywordScore(a.cert, works);
    const scoreB = keywordScore(b.cert, works);
    return scoreB - scoreA;
  });
}

function buildMatchReason(
  cert: EducationCert,
  works: string[],
  businessTypes: WorkCategory[],
  _score: number
): string {
  const hits = cert.keywords.filter((kw) =>
    works.join(" ").toLowerCase().includes(kw.toLowerCase())
  );
  if (hits.length > 0) return `「${hits.slice(0, 3).join("・")}」に関連`;
  const cat = cert.workCategories.find((c) => businessTypes.includes(c));
  if (cat) return `業種「${cat}」で該当`;
  return "条件に合致";
}

/**
 * Identify certifications that are required but not yet held.
 * @param currentCertIds - IDs of certs the worker already has
 * @param required - Output from determineRequiredCerts
 */
export function identifyMissing(
  currentCertIds: string[],
  required: RequiredCertResult[]
): MissingCertResult[] {
  return required
    .filter((r) => !currentCertIds.includes(r.cert.id))
    .map((r) => ({ cert: r.cert, matchReason: r.matchReason }));
}

/** Search all certs by free-text query (name + keywords + targetWork) */
export function searchCerts(query: string): EducationCert[] {
  const q = query.toLowerCase();
  return ALL_CERTS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.targetWork.toLowerCase().includes(q) ||
      c.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
      c.relatedLaw.toLowerCase().includes(q)
  );
}

/** Get a single cert by ID */
export function getCertById(id: string): EducationCert | undefined {
  return ALL_CERTS.find((c) => c.id === id);
}

/** Get all certs of a given type */
export function getCertsByType(type: EducationCert["certType"]): EducationCert[] {
  return ALL_CERTS.filter((c) => c.certType === type);
}

/** Label map for cert types */
export const CERT_TYPE_LABELS: Record<EducationCert["certType"], string> = {
  special_education: "特別教育",
  skill_training: "技能講習",
  job_chief: "職長教育・管理者研修",
  license: "免許（国家試験）",
};

/** Color classes for cert types (Tailwind) */
export const CERT_TYPE_COLORS: Record<EducationCert["certType"], { badge: string; border: string; header: string }> = {
  special_education: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    border: "border-l-amber-400",
    header: "text-amber-900",
  },
  skill_training: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    border: "border-l-blue-400",
    header: "text-blue-900",
  },
  job_chief: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    border: "border-l-emerald-400",
    header: "text-emerald-900",
  },
  license: {
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    border: "border-l-purple-400",
    header: "text-purple-900",
  },
};

/** Work category label map (Japanese) */
export const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  logistics: "運送・物流",
  chemical: "化学・石油",
  electrical: "電気・設備",
  forestry: "林業・木材",
  mining: "鉱業・採石",
  shipbuilding: "造船・船舶",
  general: "全業種共通",
};

/** Preset work tag suggestions for the finder UI */
export const WORK_TAG_PRESETS: Record<WorkCategory, string[]> = {
  construction: [
    "足場", "フルハーネス", "高所作業", "玉掛け", "クレーン",
    "掘削", "トンネル", "解体", "石綿除去", "型枠",
  ],
  manufacturing: [
    "アーク溶接", "プレス機", "フォークリフト", "有機溶剤",
    "特定化学物質", "研削", "コンベヤー",
  ],
  logistics: [
    "フォークリフト", "クレーン", "玉掛け", "高所作業車", "コンベヤー",
  ],
  chemical: [
    "有機溶剤", "特定化学物質", "ボイラー", "化学設備",
  ],
  electrical: [
    "低圧電気", "高圧電気", "電気工事", "配線",
  ],
  forestry: [
    "チェーンソー", "伐木", "木材加工", "不整地運搬車",
  ],
  mining: [
    "発破", "採石", "掘削", "岩石",
  ],
  shipbuilding: [
    "アーク溶接", "クレーン", "玉掛け", "ガス溶接",
  ],
  general: [
    "酸欠", "粉じん", "高所作業", "職長教育",
  ],
};
