/**
 * Education certification determination engine.
 * Matches work descriptions and industry types to required certifications.
 */

import type {
  CraneOperationMode,
  EducationCert,
  EducationLegalStatus,
  WorkCategory,
  CertDetermineInput,
  RequiredCertResult,
  MissingCertResult,
  QualificationConditionState,
} from "@/types/education-cert";
import { ALL_CERTS } from "@/data/education-rules";

export const QUALIFICATION_DATA_AS_OF = "2026-07-24";

const STATUTORY_STATUSES = new Set<EducationLegalStatus>([
  "statutoryWorkRestriction",
  "statutorySpecialEducation",
  "statutoryAppointment",
  "statutoryEducation",
  "statutoryEffort",
]);

const MANDATORY_CANDIDATE_STATUSES = new Set<EducationLegalStatus>([
  "statutoryWorkRestriction",
  "statutorySpecialEducation",
  "statutoryAppointment",
  "statutoryEducation",
]);

/**
 * 法令上の制度かどうか。免許・技能講習といった certType からは推定しない。
 * 努力義務も「法令上の制度」には含むが、required 判定には使わない。
 */
export function isStatutory(cert: EducationCert): boolean {
  return STATUTORY_STATUSES.has(cert.legalStatus ?? "unverified");
}

function isMandatoryStatutoryCandidate(cert: EducationCert): boolean {
  return MANDATORY_CANDIDATE_STATUSES.has(
    cert.legalStatus ?? "unverified",
  );
}

function canClaimRequired(cert: EducationCert): boolean {
  return (
    isMandatoryStatutoryCandidate(cert) &&
    cert.sourceVerification === "humanVerified"
  );
}

export function createCertCandidateResult(
  cert: EducationCert,
  matchReason: string,
  conditionState: QualificationConditionState = "missing",
  conditionsConfirmed = false,
): RequiredCertResult {
  const legalStatus = cert.legalStatus ?? "unverified";
  const decision = isMandatoryStatutoryCandidate(cert)
    ? "statutoryCandidate"
    : legalStatus === "unverified"
      ? "unverified"
      : "related";

  return {
    cert,
    matchReason,
    // 自由語の一致だけでは required にしない。人手確認済み一次資料と
    // 明示条件の確認が両方そろった場合だけ後方互換フィールドを上げる。
    priority:
      conditionsConfirmed &&
      conditionState === "satisfied" &&
      canClaimRequired(cert)
        ? "required"
        : "recommended",
    decision,
    conditionState,
    humanReviewRequired: true,
  };
}

/** Keyword match: returns score 0..N based on how many keywords hit */
function keywordScore(cert: EducationCert, works: string[]): number {
  const haystack = works.join(" ").normalize("NFKC").toLowerCase();
  return cert.keywords.filter((kw) => haystack.includes(kw.toLowerCase())).length;
}

/** Category match: true if cert covers at least one of the requested categories */
function categoryMatch(cert: EducationCert, businessTypes: WorkCategory[]): boolean {
  if (cert.workCategories.includes("general")) return true;
  return businessTypes.some((bt) => cert.workCategories.includes(bt));
}

type CapacityRange = {
  minInclusive?: number;
  maxExclusive?: number;
  exact?: number;
};

type CraneConditions = {
  isCrane: boolean;
  isMobile: boolean;
  isCrossingTelpher: boolean;
  capacity?: CapacityRange;
  mode: CraneOperationMode;
  explicitlyConfirmed: boolean;
};

function parseCraneCapacity(text: string): CapacityRange | undefined {
  const unit = "(?:t|トン)";
  const range = text.match(
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*${unit}\\s*以上[^\\d]{0,12}(\\d+(?:\\.\\d+)?)\\s*${unit}\\s*未満`,
      "i",
    ),
  );
  if (range) {
    return {
      minInclusive: Number(range[1]),
      maxExclusive: Number(range[2]),
    };
  }

  const below = text.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\s*未満`, "i"),
  );
  if (below) return { maxExclusive: Number(below[1]) };

  const atLeast = text.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\s*以上`, "i"),
  );
  if (atLeast) return { minInclusive: Number(atLeast[1]) };

  const exact = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}`, "i"));
  if (exact) return { exact: Number(exact[1]) };
  return undefined;
}

/**
 * フォークリフトの法定区分は、運搬する荷の重量ではなく車両の「最大荷重」で
 * 決まる。自由文に現れた最初の t 値を流用せず、最大荷重・定格能力と明示的に
 * 結び付いた数値だけを判定材料にする。
 */
function parseForkliftCapacity(text: string): CapacityRange | undefined {
  const explicitBeforeNumber = text.match(
    /(?:最大荷重|定格能力|銘板(?:上|記載)?の?最大荷重)[^。\n,，]{0,20}?\d+(?:\.\d+)?\s*(?:t|トン)(?:\s*(?:以上|未満))?/i,
  );
  if (explicitBeforeNumber) {
    return parseCraneCapacity(explicitBeforeNumber[0]);
  }

  const explicitAfterNumber = text.match(
    /\d+(?:\.\d+)?\s*(?:t|トン)(?:\s*(?:以上|未満))?[^。\n,，]{0,10}?(?:最大荷重|定格能力)/i,
  );
  return explicitAfterNumber
    ? parseCraneCapacity(explicitAfterNumber[0])
    : undefined;
}

/**
 * 玉掛けの区分は実際の荷の重量ではなく、使用するクレーン等の
 * 「つり上げ荷重」で決まる。数値だけ、または「荷1t」の記載では確定しない。
 */
function parseTamakakeCapacity(text: string): CapacityRange | undefined {
  const explicitBeforeNumber = text.match(
    /(?:つり上げ荷重|吊り上げ荷重|吊上げ荷重)[^。\n,，]{0,20}?\d+(?:\.\d+)?\s*(?:t|トン)(?:\s*(?:以上|未満))?/i,
  );
  if (explicitBeforeNumber) {
    return parseCraneCapacity(explicitBeforeNumber[0]);
  }

  const explicitAfterNumber = text.match(
    /\d+(?:\.\d+)?\s*(?:t|トン)(?:\s*(?:以上|未満))?[^。\n,，]{0,10}?(?:つり上げ荷重|吊り上げ荷重|吊上げ荷重)/i,
  );
  return explicitAfterNumber
    ? parseCraneCapacity(explicitAfterNumber[0])
    : undefined;
}

function detectCraneMode(text: string): CraneOperationMode {
  if (/(床上無線|無線操作|無線式|リモコン|ラジコン)/.test(text)) {
    return "wireless";
  }
  if (/床上運転式/.test(text)) return "floorTravelOnly";
  if (
    /床上操作式|運転者が荷(?:の移動)?とともに移動|荷の移動とともに移動/.test(
      text,
    )
  ) {
    return "floorFollowLoad";
  }
  if (/(運転室|機上運転|キャブ)/.test(text)) return "cab";
  return "unknown";
}

function extractCraneConditions(input: CertDetermineInput): CraneConditions {
  const text = input.works
    .join(" ")
    .normalize("NFKC")
    .toLowerCase();
  const explicitCapacity = input.context?.liftingCapacityTon;
  return {
    isCrane: /(クレーン|ホイスト|テルハ|ラフター|ユニック)/.test(text),
    isMobile: /(移動式クレーン|ラフター|ユニック|トラッククレーン)/.test(
      text,
    ),
    isCrossingTelpher: /跨線テルハ/.test(text),
    capacity:
      explicitCapacity !== undefined
        ? { exact: explicitCapacity }
        : parseCraneCapacity(text),
    mode:
      input.context?.craneOperationMode &&
      input.context.craneOperationMode !== "unknown"
        ? input.context.craneOperationMode
        : detectCraneMode(text),
    explicitlyConfirmed: input.context?.conditionsConfirmed === true,
  };
}

function rangeIsBelow(range: CapacityRange, boundary: number): boolean {
  if (range.exact !== undefined) return range.exact < boundary;
  return (
    range.maxExclusive !== undefined && range.maxExclusive <= boundary
  );
}

function rangeIsAtLeast(range: CapacityRange, boundary: number): boolean {
  if (range.exact !== undefined) return range.exact >= boundary;
  return (
    range.minInclusive !== undefined && range.minInclusive >= boundary
  );
}

type ConditionEvaluation = {
  include: boolean;
  state: QualificationConditionState;
  note?: string;
};

function evaluateForkliftCondition(
  cert: EducationCert,
  works: string[],
): ConditionEvaluation | null {
  if (
    cert.id !== "se-36-5-forklift" &&
    cert.id !== "st-forklift"
  ) {
    return null;
  }
  const text = works.join(" ").normalize("NFKC");
  if (!/フォークリフト|フォーク\s*リフト/.test(text)) return null;

  if (/公道|一般道|道路上(?:を)?(?:走行|運転)/.test(text)) {
    return {
      include: true,
      state: "missing",
      note:
        "公道走行は労働安全衛生上の教育区分だけでは判定できません。車両の最大荷重・車両区分・走行場所と、道路交通法上の運転免許を分けて確認してください",
    };
  }

  const capacity = parseForkliftCapacity(text);
  if (!capacity) {
    return {
      include: true,
      state: "missing",
      note: "最大荷重が1トン未満か1トン以上かの確認が必要",
    };
  }

  if (cert.id === "se-36-5-forklift") {
    if (rangeIsAtLeast(capacity, 1)) {
      return { include: false, state: "conflicting" };
    }
    return {
      include: true,
      state: rangeIsBelow(capacity, 1) ? "satisfied" : "missing",
      note: "最大荷重1トン未満として照合",
    };
  }

  if (rangeIsBelow(capacity, 1)) {
    return { include: false, state: "conflicting" };
  }
  return {
    include: true,
    state: rangeIsAtLeast(capacity, 1) ? "satisfied" : "missing",
    note: "最大荷重1トン以上として照合",
  };
}

function evaluateTamakakeCondition(
  cert: EducationCert,
  works: string[],
): ConditionEvaluation | null {
  if (
    cert.id !== "se-36-19-tamakake" &&
    cert.id !== "st-tamakake"
  ) {
    return null;
  }
  const text = works.join(" ").normalize("NFKC");
  if (!/玉掛け|スリング|ワイヤロープ/.test(text)) return null;

  const capacity = parseTamakakeCapacity(text);
  if (!capacity) {
    return {
      include: true,
      state: "missing",
      note:
        "荷の重量ではなく、使用するクレーン等のつり上げ荷重が1トン未満か1トン以上かの確認が必要",
    };
  }

  if (cert.id === "se-36-19-tamakake") {
    if (rangeIsAtLeast(capacity, 1)) {
      return { include: false, state: "conflicting" };
    }
    return {
      include: true,
      state: rangeIsBelow(capacity, 1) ? "satisfied" : "missing",
      note: "使用するクレーン等のつり上げ荷重1トン未満として照合",
    };
  }

  if (rangeIsBelow(capacity, 1)) {
    return { include: false, state: "conflicting" };
  }
  return {
    include: true,
    state: rangeIsAtLeast(capacity, 1) ? "satisfied" : "missing",
    note: "使用するクレーン等のつり上げ荷重1トン以上として照合",
  };
}

function evaluateCraneCondition(
  cert: EducationCert,
  conditions: CraneConditions,
): ConditionEvaluation | null {
  if (!conditions.isCrane) return null;

  const generalCraneIds = new Set([
    "se-36-15-crane-under5t",
    "se-36-17-derrick",
    "st-crane-5t",
    "lic-crane-derrick",
  ]);
  const mobileCraneIds = new Set([
    "se-36-16-mobile-crane",
    "st-mobile-crane",
    "lic-mobile-crane",
  ]);

  if (generalCraneIds.has(cert.id) && conditions.isMobile) {
    return { include: false, state: "conflicting" };
  }
  if (mobileCraneIds.has(cert.id) && !conditions.isMobile) {
    return { include: false, state: "conflicting" };
  }

  if (cert.id === "st-crane-5t") {
    if (conditions.mode !== "floorFollowLoad") {
      return { include: false, state: "conflicting" };
    }
    if (!conditions.capacity) {
      return {
        include: true,
        state: "missing",
        note: "つり上げ荷重の確認が必要",
      };
    }
    if (rangeIsBelow(conditions.capacity, 5)) {
      return { include: false, state: "conflicting" };
    }
    return {
      include: true,
      state: rangeIsAtLeast(conditions.capacity, 5) ? "satisfied" : "missing",
      note: "床上操作式（運転者が荷とともに移動）として照合",
    };
  }

  if (cert.id === "lic-crane-derrick") {
    if (!conditions.capacity) {
      return {
        include: true,
        state: "missing",
        note: "5トン以上か、操作方式は何かの確認が必要",
      };
    }
    if (rangeIsBelow(conditions.capacity, 5)) {
      return { include: false, state: "conflicting" };
    }
    return {
      include: true,
      state:
        rangeIsAtLeast(conditions.capacity, 5) &&
        conditions.mode !== "unknown"
          ? "satisfied"
          : "missing",
      note:
        conditions.mode === "floorFollowLoad"
          ? "床上操作式技能講習との代替関係を確認"
          : "5トン以上の一般クレーンとして照合",
    };
  }

  if (cert.id === "se-36-15-crane-under5t") {
    if (!conditions.capacity) {
      return {
        include: true,
        state: "missing",
        note: "5トン未満かどうかの確認が必要",
      };
    }
    if (
      rangeIsAtLeast(conditions.capacity, 5) &&
      !conditions.isCrossingTelpher
    ) {
      return { include: false, state: "conflicting" };
    }
    return {
      include: true,
      state:
        rangeIsBelow(conditions.capacity, 5) ||
        conditions.isCrossingTelpher
          ? "satisfied"
          : "missing",
    };
  }

  const mobileBoundaries: Record<
    string,
    { min: number; max?: number }
  > = {
    "se-36-16-mobile-crane": { min: 0, max: 1 },
    "st-mobile-crane": { min: 1, max: 5 },
    "lic-mobile-crane": { min: 5 },
  };
  const boundary = mobileBoundaries[cert.id];
  if (boundary) {
    if (!conditions.capacity) {
      return {
        include: true,
        state: "missing",
        note: "つり上げ荷重による区分の確認が必要",
      };
    }
    if (
      boundary.max !== undefined &&
      rangeIsAtLeast(conditions.capacity, boundary.max)
    ) {
      return { include: false, state: "conflicting" };
    }
    if (rangeIsBelow(conditions.capacity, boundary.min)) {
      return { include: false, state: "conflicting" };
    }
    const lowerSatisfied =
      boundary.min === 0 || rangeIsAtLeast(conditions.capacity, boundary.min);
    const upperSatisfied =
      boundary.max === undefined ||
      rangeIsBelow(conditions.capacity, boundary.max);
    return {
      include: true,
      state: lowerSatisfied && upperSatisfied ? "satisfied" : "missing",
    };
  }

  return null;
}

/**
 * Determine required certifications based on industry and work descriptions.
 * 自由語検索は候補抽出であり、required の確定ではない。
 */
export function determineRequiredCerts(
  input: CertDetermineInput,
  options?: { minScore?: number }
): RequiredCertResult[] {
  const { businessTypes, works } = input;
  const minScore = options?.minScore ?? 1;
  const results: RequiredCertResult[] = [];
  const craneConditions = extractCraneConditions(input);

  for (const cert of ALL_CERTS) {
    const score = keywordScore(cert, works);
    const catMatch = categoryMatch(cert, businessTypes);

    if (score < minScore && !catMatch) continue;
    if (score === 0 && catMatch && works.length > 0) continue; // category only, skip if works were specified

    const condition =
      evaluateForkliftCondition(cert, works) ??
      evaluateTamakakeCondition(cert, works) ??
      evaluateCraneCondition(cert, craneConditions);
    if (condition && !condition.include) continue;
    const conditionState =
      condition?.state ??
      (input.context?.conditionsConfirmed === true ? "satisfied" : "missing");
    const baseReason = buildMatchReason(cert, works, businessTypes);
    const matchReason = condition?.note
      ? `${baseReason}。${condition.note}`
      : baseReason;

    results.push(
      createCertCandidateResult(
        cert,
        matchReason,
        conditionState,
        craneConditions.explicitlyConfirmed,
      ),
    );
  }

  return results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "required" ? -1 : 1;
    if (a.decision !== b.decision) {
      const order = {
        statutoryCandidate: 0,
        related: 1,
        unverified: 2,
      };
      return order[a.decision] - order[b.decision];
    }
    const scoreA = keywordScore(a.cert, works);
    const scoreB = keywordScore(b.cert, works);
    return scoreB - scoreA;
  });
}

function buildMatchReason(
  cert: EducationCert,
  works: string[],
  businessTypes: WorkCategory[],
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
    .filter(
      (result) =>
        result.priority === "required" &&
        !currentCertIds.includes(result.cert.id),
    )
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
