import type { WorkCategory } from "@/types/education-cert";

export const QUALIFICATION_FINDER_PATH =
  "/education-certification/finder" as const;

export const QUALIFICATION_FINDER_QUERY_KEYS = [
  "q",
  "industry",
  "role",
] as const;

const MAX_QUERY_KEY_LENGTH = 16;
const MAX_QUERY_VALUE_LENGTH = 32;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const ATTRIBUTION_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
]);

type QueryKey = (typeof QUALIFICATION_FINDER_QUERY_KEYS)[number];

type CandidateTermPolicy = {
  coverage: "candidate";
};

type ReviewRequiredTermPolicy = {
  coverage: "reviewRequired";
};

type TopicGuideTermPolicy = {
  coverage: "topicGuide";
  guideHref: string;
  guideLabel: string;
};

export type QualificationFinderTermPolicy =
  | CandidateTermPolicy
  | ReviewRequiredTermPolicy
  | TopicGuideTermPolicy;

/**
 * Existing, reviewed deep-link terms.
 *
 * `candidate` means the current candidate corpus returns at least one item.
 * `reviewRequired` means the term is a valid hand-off from an existing page,
 * but the current corpus cannot determine a qualification candidate.
 * `topicGuide` means a dedicated, canonical HTML guide is more useful than the
 * qualification corpus. It remains accepted for old bookmarks.
 *
 * These classifications are navigation/data-coverage facts. They do not add
 * or infer any legal qualification requirement.
 */
export const QUALIFICATION_FINDER_TERM_POLICY = {
  HACCP: { coverage: "reviewRequired" },
  アーク溶接: { coverage: "candidate" },
  カスハラ: { coverage: "reviewRequired" },
  クレーン: { coverage: "candidate" },
  ゴンドラ: { coverage: "candidate" },
  ショベルローダー: { coverage: "candidate" },
  ストレスチェック: {
    coverage: "topicGuide",
    guideHref: "/mental-health-management/stress-check",
    guideLabel: "ストレスチェックの実務ガイドを開く",
  },
  テールゲートリフター: { coverage: "candidate" },
  ハラスメント: { coverage: "reviewRequired" },
  フォークリフト: { coverage: "candidate" },
  フルハーネス: { coverage: "candidate" },
  プレス: { coverage: "candidate" },
  メンタルヘルス: {
    coverage: "topicGuide",
    guideHref: "/mental-health-management",
    guideLabel: "メンタルヘルス対策の実務ガイドを開く",
  },
  ロープ高所: { coverage: "candidate" },
  化学物質管理者: { coverage: "reviewRequired" },
  感染対策: { coverage: "reviewRequired" },
  有機溶剤: { coverage: "candidate" },
  毒物劇物: { coverage: "reviewRequired" },
  熱中症: {
    coverage: "topicGuide",
    guideHref: "/heat-illness-prevention",
    guideLabel: "熱中症予防の実務ガイドを開く",
  },
  特定化学物質: { coverage: "candidate" },
  玉掛け: { coverage: "candidate" },
  産業用ロボット: { coverage: "candidate" },
  石綿: { coverage: "candidate" },
  研削: { coverage: "candidate" },
  移動式クレーン: { coverage: "candidate" },
  職長: { coverage: "candidate" },
  腰痛: {
    coverage: "topicGuide",
    guideHref: "/education/roudoueisei/youtsu-yobou",
    guideLabel: "腰痛予防教育のガイドを開く",
  },
  衛生推進者: { coverage: "candidate" },
  衛生管理者: { coverage: "candidate" },
  認知症: { coverage: "reviewRequired" },
  足場: { coverage: "candidate" },
  車両系建設機械: { coverage: "candidate" },
  運行管理者: { coverage: "reviewRequired" },
  防火管理: { coverage: "reviewRequired" },
  雇入れ時教育: { coverage: "reviewRequired" },
  食品衛生: { coverage: "reviewRequired" },
} as const satisfies Record<string, QualificationFinderTermPolicy>;

export type QualificationFinderTerm =
  keyof typeof QUALIFICATION_FINDER_TERM_POLICY;

type IndustryPolicy = {
  category: WorkCategory;
  label: string;
};

/**
 * Public role/industry URLs use site-wide audience vocabulary. Keep their
 * mapping to the narrower qualification engine categories explicit.
 */
export const QUALIFICATION_FINDER_INDUSTRY_POLICY = {
  construction: { category: "construction", label: "建設業" },
  manufacturing: { category: "manufacturing", label: "製造業" },
  transport: { category: "logistics", label: "運送・物流" },
  healthcare: { category: "general", label: "医療・介護（全業種共通候補）" },
  service: { category: "general", label: "サービス業（全業種共通候補）" },
} as const satisfies Record<string, IndustryPolicy>;

export type QualificationFinderIndustry =
  keyof typeof QUALIFICATION_FINDER_INDUSTRY_POLICY;

type RolePolicy = {
  conditionValue: string;
  label: string;
};

export const QUALIFICATION_FINDER_ROLE_POLICY = {
  solo: {
    conditionValue: "一人親方・個人事業主",
    label: "一人親方・個人事業主",
  },
  "safety-manager": {
    conditionValue: "安全衛生担当者",
    label: "安全衛生担当者",
  },
} as const satisfies Record<string, RolePolicy>;

export type QualificationFinderRole =
  keyof typeof QUALIFICATION_FINDER_ROLE_POLICY;

export type QualificationFinderConditions = {
  height: string;
  equipment: string;
  target: string;
  voltage: string;
  role: string;
};

export type QualificationFinderPrefill =
  | {
      status: "none";
      inheritedItems: readonly [];
    }
  | {
      status: "rejected";
      inheritedItems: readonly [];
    }
  | {
      status: "accepted";
      inheritedItems: readonly string[];
      termCoverage?: QualificationFinderTermPolicy["coverage"];
      guideHref?: string;
      guideLabel?: string;
    };

export type QualificationFinderInitialState = {
  /**
   * Safe key used by the server page to remount the client when browser
   * back/forward navigation changes accepted query conditions.
   */
  stateKey: string;
  selectedCategories: readonly WorkCategory[];
  freeText: string;
  conditions: Readonly<QualificationFinderConditions>;
  prefill: QualificationFinderPrefill;
};

export type QualificationFinderSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

const EMPTY_CONDITIONS: Readonly<QualificationFinderConditions> = {
  height: "",
  equipment: "",
  target: "",
  voltage: "",
  role: "",
};

export function createEmptyQualificationFinderInitialState(): QualificationFinderInitialState {
  return {
    stateKey: "direct",
    selectedCategories: [],
    freeText: "",
    conditions: { ...EMPTY_CONDITIONS },
    prefill: { status: "none", inheritedItems: [] },
  };
}

function createRejectedQualificationFinderInitialState(): QualificationFinderInitialState {
  return {
    stateKey: "rejected",
    selectedCategories: [],
    freeText: "",
    conditions: { ...EMPTY_CONDITIONS },
    prefill: { status: "rejected", inheritedItems: [] },
  };
}

function isQueryKey(value: string): value is QueryKey {
  return (QUALIFICATION_FINDER_QUERY_KEYS as readonly string[]).includes(value);
}

function hasOwnKey<T extends object>(
  object: T,
  key: PropertyKey,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isSafeScalar(key: string, value: string): boolean {
  return (
    Array.from(key).length <= MAX_QUERY_KEY_LENGTH &&
    Array.from(value).length <= MAX_QUERY_VALUE_LENGTH &&
    !CONTROL_CHARACTERS.test(key) &&
    !CONTROL_CHARACTERS.test(value)
  );
}

function queryEntries(
  query:
    | QualificationFinderSearchParams
    | URLSearchParams
    | null
    | undefined,
): Array<[string, string | string[] | undefined]> {
  if (query == null) return [];
  if (query instanceof URLSearchParams) {
    return [...query.entries()];
  }
  return Object.entries(query);
}

/**
 * Converts untrusted URL query values into a small typed initial state.
 *
 * Contract:
 * - only q / industry / role become state;
 * - safe, single UTM attribution values may accompany them and are discarded;
 * - each key may occur once and the whole query may contain at most 3 values;
 * - values are exact allowlist matches (no trimming, case-folding or guessing);
 * - arrays, unknown keys/values, overlong values and control characters reject
 *   the entire prefill;
 * - rejected raw values never cross the server/client boundary.
 */
export function parseQualificationFinderQuery(
  query:
    | QualificationFinderSearchParams
    | URLSearchParams
    | null
    | undefined,
): QualificationFinderInitialState {
  const entries = queryEntries(query);
  if (entries.length === 0) {
    return createEmptyQualificationFinderInitialState();
  }
  const seen = new Set<QueryKey>();
  const seenAttribution = new Set<string>();
  let term: QualificationFinderTerm | undefined;
  let industry: QualificationFinderIndustry | undefined;
  let role: QualificationFinderRole | undefined;

  for (const [key, rawValue] of entries) {
    if (ATTRIBUTION_QUERY_KEYS.has(key)) {
      if (
        seenAttribution.has(key) ||
        typeof rawValue !== "string" ||
        !isSafeScalar(key, rawValue)
      ) {
        return createRejectedQualificationFinderInitialState();
      }
      seenAttribution.add(key);
      continue;
    }
    if (
      !isQueryKey(key) ||
      seen.has(key) ||
      typeof rawValue !== "string" ||
      !isSafeScalar(key, rawValue)
    ) {
      return createRejectedQualificationFinderInitialState();
    }
    seen.add(key);

    if (key === "q") {
      if (!hasOwnKey(QUALIFICATION_FINDER_TERM_POLICY, rawValue)) {
        return createRejectedQualificationFinderInitialState();
      }
      term = rawValue;
      continue;
    }
    if (key === "industry") {
      if (!hasOwnKey(QUALIFICATION_FINDER_INDUSTRY_POLICY, rawValue)) {
        return createRejectedQualificationFinderInitialState();
      }
      industry = rawValue;
      continue;
    }
    if (!hasOwnKey(QUALIFICATION_FINDER_ROLE_POLICY, rawValue)) {
      return createRejectedQualificationFinderInitialState();
    }
    role = rawValue;
  }

  if (seen.size === 0) {
    return createEmptyQualificationFinderInitialState();
  }

  const termPolicy = term
    ? QUALIFICATION_FINDER_TERM_POLICY[term]
    : undefined;
  const industryPolicy = industry
    ? QUALIFICATION_FINDER_INDUSTRY_POLICY[industry]
    : undefined;
  const rolePolicy = role ? QUALIFICATION_FINDER_ROLE_POLICY[role] : undefined;
  const inheritedItems = [
    term ? `作業・テーマ: ${term}` : undefined,
    industryPolicy ? `業種: ${industryPolicy.label}` : undefined,
    rolePolicy ? `立場: ${rolePolicy.label}` : undefined,
  ].filter((item): item is string => item !== undefined);

  return {
    stateKey: `accepted:${term ?? ""}:${industry ?? ""}:${role ?? ""}`,
    selectedCategories: industryPolicy ? [industryPolicy.category] : [],
    freeText: term ?? "",
    conditions: {
      ...EMPTY_CONDITIONS,
      role: rolePolicy?.conditionValue ?? "",
    },
    prefill: {
      status: "accepted",
      inheritedItems,
      termCoverage: termPolicy?.coverage,
      guideHref:
        termPolicy?.coverage === "topicGuide"
          ? termPolicy.guideHref
          : undefined,
      guideLabel:
        termPolicy?.coverage === "topicGuide"
          ? termPolicy.guideLabel
          : undefined,
    },
  };
}
