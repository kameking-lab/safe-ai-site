import { SAFETY_QUESTIONS } from "./questions";
import { findSafetySource } from "./source-registry";
import type { SafetyCourse, SafetyQuestion } from "./types";

const OSH_ACT_URL = "https://laws.e-gov.go.jp/law/347AC0000000057";
const OSH_RULE_URL = "https://laws.e-gov.go.jp/law/347M50002000032";

const STANDARD_STRUCTURE_STEPS = [
  "設問の事実関係と求められている論点を分ける",
  "適用する法令・原則と、その適用理由を短く置く",
  "優先順位を付けた対策と、実施後の確認方法を書く",
] as const;

export const SAFETY_COURSES = [
  {
    courseId: "first-class-health-officer",
    qualificationId: "eisei-kanrisha-1shu",
    title: "第一種衛生管理者｜根拠付き問題演習",
    shortTitle: "第一種衛生管理者",
    description:
      "現行e-Gov法令の個別factから正答と全選択肢の理由を確認した独自問題です。協会公表問題の転載ではありません。",
    subjects: [
      { subjectId: "health-officer-related-laws", title: "関係法令" },
      { subjectId: "health-officer-occupational-hygiene", title: "労働衛生" },
    ],
    questionIds: [
      "h1-appointment-threshold-001",
      "h1-listed-industry-license-002",
      "h1-weekly-patrol-003",
      "h1-health-committee-members-004",
    ],
    officialResourceSourceIds: [
      "license-question-index",
      "license-health-officer-first-2026-04",
    ],
    unscoredDescriptiveResources: [],
    published: true,
    verifiedAt: "2026-08-09T10:22:00+09:00",
  },
  {
    courseId: "second-class-health-officer",
    qualificationId: "eisei-kanrisha-2shu",
    title: "第二種衛生管理者｜根拠付き問題演習",
    shortTitle: "第二種衛生管理者",
    description:
      "業種範囲、選任人数、衛生委員会などを、現行e-Gov法令に結び付けた独自問題で確認します。",
    subjects: [
      { subjectId: "health-officer-related-laws", title: "関係法令" },
      { subjectId: "health-officer-occupational-hygiene", title: "労働衛生" },
    ],
    questionIds: [
      "h2-second-class-scope-001",
      "h2-manager-minimum-275-002",
      "h2-under-threshold-003",
      "h2-committee-cycle-record-004",
    ],
    officialResourceSourceIds: [
      "license-question-index",
      "license-health-officer-second-2026-04",
    ],
    unscoredDescriptiveResources: [],
    published: true,
    verifiedAt: "2026-08-09T10:22:00+09:00",
  },
  {
    courseId: "occupational-safety-consultant",
    qualificationId: "rodo-anzen-consultant",
    title: "労働安全コンサルタント｜選択式問題演習",
    shortTitle: "労働安全コンサルタント",
    description:
      "産業安全一般・産業安全関係法令の自動採点コースです。記述式は公式正答がないため、別の非採点resourceとして扱います。",
    subjects: [
      { subjectId: "industrial-safety-general", title: "産業安全一般" },
      { subjectId: "industrial-safety-laws", title: "産業安全関係法令" },
    ],
    questionIds: [
      "osc-risk-assessment-001",
      "osc-safety-manager-action-002",
      "osc-role-003",
      "osc-confidentiality-004",
    ],
    officialResourceSourceIds: [
      "consultant-question-index",
      "consultant-safety-general-2025",
      "consultant-safety-law-2025",
    ],
    unscoredDescriptiveResources: [
      {
        resourceId: "safety-machine-unscored",
        title: "機械安全（非採点）",
        sourceId: "consultant-safety-descriptive-machine-2025",
        topicChecklist: ["危険源", "安全方策", "残留リスク", "実施後の確認"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
      {
        resourceId: "safety-electric-unscored",
        title: "電気安全（非採点）",
        sourceId: "consultant-safety-descriptive-electric-2025",
        topicChecklist: ["電気的危険源", "遮断・隔離", "保護方策", "復旧前確認"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
      {
        resourceId: "safety-chemical-unscored",
        title: "化学安全（非採点）",
        sourceId: "consultant-safety-descriptive-chemical-2025",
        topicChecklist: ["危険・有害性", "ばく露・火災経路", "予防措置", "緊急時対応"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
      {
        resourceId: "safety-civil-unscored",
        title: "土木安全（非採点）",
        sourceId: "consultant-safety-descriptive-civil-2025",
        topicChecklist: ["施工条件", "地盤・掘削", "重機と作業者", "第三者災害"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
      {
        resourceId: "safety-building-unscored",
        title: "建築安全（非採点）",
        sourceId: "consultant-safety-descriptive-building-2025",
        topicChecklist: ["墜落・飛来落下", "倒壊", "揚重", "工程間の調整"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
    ],
    published: true,
    verifiedAt: "2026-08-09T10:22:00+09:00",
  },
  {
    courseId: "occupational-health-consultant",
    qualificationId: "rodo-eisei-consultant",
    title: "労働衛生コンサルタント｜選択式問題演習",
    shortTitle: "労働衛生コンサルタント",
    description:
      "労働衛生一般・労働衛生関係法令の自動採点コースです。健康管理・労働衛生工学の記述式は非採点です。",
    subjects: [
      { subjectId: "occupational-health-general", title: "労働衛生一般" },
      { subjectId: "occupational-health-laws", title: "労働衛生関係法令" },
    ],
    questionIds: [
      "ohc-role-001",
      "ohc-committee-topics-002",
      "ohc-exam-format-003",
      "ohc-registration-004",
    ],
    officialResourceSourceIds: [
      "consultant-question-index",
      "consultant-health-general-2025",
      "consultant-health-law-2025",
    ],
    unscoredDescriptiveResources: [
      {
        resourceId: "health-management-unscored",
        title: "健康管理（非採点）",
        sourceId: "consultant-health-descriptive-management-2025",
        topicChecklist: ["健康影響", "ばく露・業務情報", "就業上の措置", "継続確認"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
      {
        resourceId: "health-engineering-unscored",
        title: "労働衛生工学（非採点）",
        sourceId: "consultant-health-descriptive-engineering-2025",
        topicChecklist: ["発生源", "伝搬経路", "工学的対策", "測定・保守"],
        structureSteps: STANDARD_STRUCTURE_STEPS,
        lawLinks: [
          { title: "労働安全衛生法", url: OSH_ACT_URL },
          { title: "労働安全衛生規則", url: OSH_RULE_URL },
        ],
      },
    ],
    published: true,
    verifiedAt: "2026-08-09T10:22:00+09:00",
  },
] as const satisfies readonly SafetyCourse[];

export function findSafetyCourse(courseId: string): SafetyCourse | undefined {
  return SAFETY_COURSES.find((course) => course.courseId === courseId);
}

export function getCourseQuestions(course: SafetyCourse): SafetyQuestion[] {
  const byId = new Map(SAFETY_QUESTIONS.map((question) => [question.questionId, question]));
  return course.questionIds
    .map((questionId) => byId.get(questionId))
    .filter((question): question is SafetyQuestion => Boolean(question));
}

export function getCourseOfficialResources(course: SafetyCourse) {
  return course.officialResourceSourceIds
    .map((sourceId) => findSafetySource(sourceId))
    .filter((source) => source !== undefined);
}
