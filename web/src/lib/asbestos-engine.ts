/**
 * Asbestos compliance engine.
 *
 * Deterministic rule-based decisions for:
 *
 * - Pre-work investigation requirement (事前調査義務)
 * - Reporting obligation (労基署・自治体への結果報告)
 * - Notification forms to file
 * - Work-plan template selection by level
 * - Required qualifications listing
 *
 * The engine never reaches into the database or network; it operates on the
 * static rulebook in `@/data/asbestos-rules`.
 */

import type {
  AsbestosLawReference,
  AsbestosQualification,
  AsbestosWorkLevel,
  InvestigationOutcome,
  NotificationForm,
  ProjectScope,
  ReportingRequirement,
  WorkPlanTemplate,
} from "@/types/asbestos";
import {
  ASBESTOS_BAN_YEAR_FULL,
  ASBESTOS_BAN_YEAR_SPRAYED,
  REPORTING_AIR_POLLUTION_AREA_THRESHOLD_SQM,
  REPORTING_ANSEIHO_CONTRACT_THRESHOLD_JPY,
} from "@/types/asbestos";
import {
  ASBESTOS_FORMS,
  ASBESTOS_QUALIFICATIONS,
  WORK_PLANS,
} from "@/data/asbestos-rules";

/* ---------- Investigation requirement ---------- */

/**
 * Decide whether a project requires a pre-work investigation, whether a
 * qualified investigator must do it, and whether the building falls under
 * the 2006-09-01 presumption.
 *
 * R4.4 (2022-04-01) onward: pre-work investigation is required for every
 * demolition / renovation, regardless of construction year. The
 * presumption applies only to materiality of the asbestos-likelihood — not
 * to whether investigation is needed at all.
 */
export function determineInvestigationRequirement(
  scope: ProjectScope,
): InvestigationOutcome {
  const isBuilding =
    scope.buildingCategory === "residential-detached" ||
    scope.buildingCategory === "residential-multi" ||
    scope.buildingCategory === "non-residential";
  const isCivil = scope.buildingCategory === "civil-engineering";

  // New-build with no re-used components — investigation not required.
  if (scope.projectCategory === "new-build" && !scope.asbestosKnownPresent) {
    return {
      investigationRequired: false,
      qualifiedInvestigatorRequired: false,
      presumedContaining: false,
      rationale:
        "新築工事で既存建材の再利用がない場合、石綿則 §3 の事前調査義務は対象外です。ただし再利用部材や既存配管の改修が含まれる場合は別途調査が必要になります。",
      lawReferences: [
        {
          name: "石綿障害予防規則",
          articles: ["第3条"],
          summary:
            "解体・改造・補修作業を行うときの事前調査義務を規定。新築のみで完結する工事は対象外。",
        },
      ],
    };
  }

  const presumedContaining =
    scope.asbestosKnownPresent === true ||
    scope.constructionStartYear < ASBESTOS_BAN_YEAR_FULL;

  const rationaleParts: string[] = [];
  if (scope.asbestosKnownPresent) {
    rationaleParts.push(
      "石綿含有が判明している部位を含む工事のため、事前調査と作業計画の対象です。",
    );
  } else if (scope.constructionStartYear < ASBESTOS_BAN_YEAR_SPRAYED) {
    rationaleParts.push(
      `${ASBESTOS_BAN_YEAR_SPRAYED}年以前の建築物では吹付け石綿（レベル1）の使用が認められていたため、特に注意深い調査が必要です。`,
    );
  } else if (scope.constructionStartYear < ASBESTOS_BAN_YEAR_FULL) {
    rationaleParts.push(
      `${ASBESTOS_BAN_YEAR_FULL}年9月の全面禁止より前の建築物のため、含有率0.1%超の石綿含有建材が使用されている可能性が高く、含有とみなして調査を進める必要があります。`,
    );
  } else {
    rationaleParts.push(
      `${ASBESTOS_BAN_YEAR_FULL}年9月以降の建築物は法令上石綿含有建材の使用が禁止されていますが、改修部材・既存配管に含有物が残存する可能性があるため事前調査は省略できません。`,
    );
  }

  // Pre-work investigation is mandatory for demolition / renovation /
  // maintenance regardless of value. Qualified investigator requirement
  // applies to buildings.
  return {
    investigationRequired: true,
    qualifiedInvestigatorRequired: isBuilding,
    presumedContaining,
    rationale: rationaleParts.join(" "),
    lawReferences: [
      {
        name: "石綿障害予防規則",
        articles: ["第3条第1項", "第3条第4項"],
        summary:
          "解体・改造・補修作業前の事前調査義務。建築物の場合は建築物石綿含有建材調査者等が調査を実施。",
      },
      {
        name: "労働安全衛生法",
        articles: ["第57条の3"],
        summary: "化学物質等の有害性等の調査と必要な措置の実施義務。",
      },
      isCivil
        ? {
            name: "石綿障害予防規則",
            articles: ["第3条第4項"],
            summary:
              "工作物は建築物石綿含有建材調査者ではなく、分析調査者または同等の知識・技能を有する者で対応可能。ただし工作物石綿事前調査者制度が令和8年4月施行予定。",
          }
        : {
            name: "建築物石綿含有建材調査者講習登録規程",
            summary:
              "建築物の事前調査は2023年10月から建築物石綿含有建材調査者が実施することが原則。",
          },
    ],
  };
}

/* ---------- Reporting obligation ---------- */

/**
 * Decide which reports must be filed for the project. R4.4 introduced the
 * 労基署 reporting threshold and aligned it with the existing 大気汚染防止法
 * 自治体報告ルート.
 *
 * Thresholds:
 * - 労基署（安衛則 §90, 石綿則 §3）: 請負金額 100 万円以上の解体・改修
 *   または特定工作物
 * - 自治体（大防法 §18-15）: 床面積 80 m² 以上の建築物解体、または請負金額
 *   100 万円以上の改修等の特定工事
 */
export function determineReportingObligation(
  scope: ProjectScope,
): { requirement: ReportingRequirement; rationale: string; lawReferences: AsbestosLawReference[] } {
  if (scope.projectCategory === "new-build" && !scope.asbestosKnownPresent) {
    return {
      requirement: "out-of-scope",
      rationale:
        "新築工事で既存建材の再利用がない場合、事前調査結果の報告対象外です。",
      lawReferences: [
        {
          name: "石綿障害予防規則",
          articles: ["第3条"],
          summary: "解体・改修・補修工事を対象とする事前調査・報告制度。",
        },
      ],
    };
  }

  const overContractThreshold =
    (scope.contractValueJpy ?? 0) >= REPORTING_ANSEIHO_CONTRACT_THRESHOLD_JPY;
  const overAreaThreshold =
    (scope.workAreaSqm ?? 0) >= REPORTING_AIR_POLLUTION_AREA_THRESHOLD_SQM;
  const isDemolition = scope.projectCategory === "demolition";
  const isBuilding =
    scope.buildingCategory === "residential-detached" ||
    scope.buildingCategory === "residential-multi" ||
    scope.buildingCategory === "non-residential";

  // 自治体（大防法）報告:
  // - 解体: 床面積 80 m² 以上
  // - 改修: 請負金額 100 万円以上
  const airPollutionTriggered =
    (isDemolition && isBuilding && overAreaThreshold) ||
    (!isDemolition && overContractThreshold);

  // 労基署（安衛則・石綿則）報告: 請負金額 100 万円以上
  const anseihoTriggered = overContractThreshold;

  const lawReferences: AsbestosLawReference[] = [
    {
      name: "労働安全衛生規則",
      articles: ["第90条"],
      summary:
        "解体・改修工事のうち請負金額 100 万円以上（または特定工作物）の事前調査結果を労基署へ報告する義務。",
    },
    {
      name: "石綿障害予防規則",
      articles: ["第3条第6項"],
      summary:
        "事前調査結果の労基署報告義務（電子届出による）。労働者派遣・委託の場合の責任分担を含む。",
    },
    {
      name: "大気汚染防止法",
      articles: ["第18条の15"],
      summary:
        "床面積 80 m² 以上の建築物解体または請負金額 100 万円以上の特定工事は事前調査結果を自治体へ報告。",
    },
  ];

  if (anseihoTriggered && airPollutionTriggered) {
    return {
      requirement: "required-anseiho-and-airpollution",
      rationale:
        "請負金額が100万円以上、かつ床面積80 m² 以上の建築物解体または100万円以上の改修等の特定工事に該当します。労基署と自治体（大防法）両方への事前調査結果報告が必要です。",
      lawReferences,
    };
  }
  if (anseihoTriggered) {
    return {
      requirement: "required-anseiho-only",
      rationale:
        "請負金額が100万円以上のため労基署への事前調査結果報告が必要です。大防法上の特定工事には該当しないため自治体報告は対象外ですが、近隣説明と作業基準遵守は引き続き必要です。",
      lawReferences,
    };
  }
  if (airPollutionTriggered) {
    return {
      requirement: "required-airpollution-only",
      rationale:
        "床面積要件により大防法上の特定工事に該当しますが、請負金額 100 万円未満のため労基署報告は対象外です。自治体へ事前調査結果報告を提出してください。",
      lawReferences,
    };
  }
  return {
    requirement: "investigation-only",
    rationale:
      "事前調査義務（石綿則 §3）の対象ですが、請負金額・床面積いずれも報告閾値に達していないため、結果報告は不要です。事前調査結果記録は3年間保存してください。",
    lawReferences,
  };
}

/* ---------- Notification forms ---------- */

/**
 * Generate the set of notification / record-keeping forms that apply to a
 * project. Order is stable so the UI can render the list deterministically.
 */
export function generateNotificationForms(
  scope: ProjectScope,
  workLevel: AsbestosWorkLevel | null,
): NotificationForm[] {
  const { requirement } = determineReportingObligation(scope);

  const formsApplicable: NotificationForm[] = [];

  // Pre-investigation reports
  if (
    requirement === "required-anseiho-and-airpollution" ||
    requirement === "required-anseiho-only"
  ) {
    const form = ASBESTOS_FORMS.find((f) => f.id === "pre-investigation-report-mhlw");
    if (form) formsApplicable.push(form);
  }
  if (
    requirement === "required-anseiho-and-airpollution" ||
    requirement === "required-airpollution-only"
  ) {
    const form = ASBESTOS_FORMS.find((f) => f.id === "pre-investigation-report-prefecture");
    if (form) formsApplicable.push(form);
  }

  // Level-1 / Level-2 specific notifications
  if (workLevel === "level-1" || workLevel === "level-2") {
    const planNotification = ASBESTOS_FORMS.find((f) => f.id === "work-notification-level-1-2");
    if (planNotification) formsApplicable.push(planNotification);
    const specifiedDust = ASBESTOS_FORMS.find((f) => f.id === "specified-work-notification");
    if (specifiedDust) formsApplicable.push(specifiedDust);
  }

  // Universal display / record
  const display = ASBESTOS_FORMS.find((f) => f.id === "onsite-display");
  if (display) formsApplicable.push(display);
  const record = ASBESTOS_FORMS.find((f) => f.id === "investigation-record");
  if (record) formsApplicable.push(record);

  // Air monitoring for level-1 / level-2 隔離工事
  if (workLevel === "level-1" || workLevel === "level-2") {
    const monitoring = ASBESTOS_FORMS.find((f) => f.id === "air-monitoring-record");
    if (monitoring) formsApplicable.push(monitoring);
  }

  return formsApplicable;
}

/* ---------- Work plan ---------- */

export function getWorkPlanTemplate(level: AsbestosWorkLevel): WorkPlanTemplate {
  return WORK_PLANS[level];
}

/* ---------- Required qualifications ---------- */

export function listRequiredQualifications(
  workLevel: AsbestosWorkLevel | null,
): AsbestosQualification[] {
  // 作業主任者・特別教育は全レベル共通。
  // 調査者・分析者は事前調査・分析を行う場合に必須。
  const required: AsbestosQualification[] = [];

  const chief = ASBESTOS_QUALIFICATIONS.find((q) => q.id === "chief-supervisor");
  const special = ASBESTOS_QUALIFICATIONS.find((q) => q.id === "special-education");
  const investigator = ASBESTOS_QUALIFICATIONS.find((q) => q.id === "qualified-investigator");
  const analyst = ASBESTOS_QUALIFICATIONS.find((q) => q.id === "analyst");

  if (chief) required.push(chief);
  if (special) required.push(special);
  if (investigator) required.push(investigator);
  if (workLevel !== "level-3" && analyst) {
    // Analyst is most likely to be involved when boards / sprayed materials
    // need confirmatory analysis — surface it for level-1 / level-2 / null.
    required.push(analyst);
  }
  return required;
}

/* ---------- Convenience: full pre-work summary ---------- */

export interface PreWorkSummary {
  investigation: InvestigationOutcome;
  reporting: {
    requirement: ReportingRequirement;
    rationale: string;
    lawReferences: AsbestosLawReference[];
  };
  forms: NotificationForm[];
  qualifications: AsbestosQualification[];
}

/**
 * One-shot helper used by `/asbestos-management/investigation-checker` to
 * combine all decisions for a given scope.
 */
export function buildPreWorkSummary(
  scope: ProjectScope,
  workLevel: AsbestosWorkLevel | null = null,
): PreWorkSummary {
  return {
    investigation: determineInvestigationRequirement(scope),
    reporting: determineReportingObligation(scope),
    forms: generateNotificationForms(scope, workLevel),
    qualifications: listRequiredQualifications(workLevel),
  };
}
