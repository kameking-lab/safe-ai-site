export interface SafetySourceAdapterDefinition {
  adapterId: string;
  publisher: string;
  officialHosts: readonly string[];
  supportsQuestionDiscovery: boolean;
  supportsOfficialAnswerExtraction: boolean;
  supportsRightsClassification: boolean;
  stableParentIndexRequired: boolean;
  examYearRequired: boolean;
  autoPublish: false;
  pipeline: readonly [
    "discover",
    "classifyRights",
    "extractQuestionAndAnswer",
    "collectOptionFacts",
    "validate",
    "manualReviewManifest",
    "publish",
  ];
}

export const SAFETY_SOURCE_ADAPTERS = [
  {
    adapterId: "safety-health-examination-association",
    publisher: "公益財団法人 安全衛生技術試験協会",
    officialHosts: ["www.exam.or.jp"],
    supportsQuestionDiscovery: true,
    supportsOfficialAnswerExtraction: true,
    supportsRightsClassification: true,
    stableParentIndexRequired: true,
    examYearRequired: true,
    autoPublish: false,
    pipeline: [
      "discover",
      "classifyRights",
      "extractQuestionAndAnswer",
      "collectOptionFacts",
      "validate",
      "manualReviewManifest",
      "publish",
    ],
  },
] as const satisfies readonly SafetySourceAdapterDefinition[];

export const SAFETY_SOURCE_ADOPTION_REQUIREMENTS = [
  "official_primary_source",
  "questions_published",
  "official_answers_published",
  "exam_year_explicit",
  "stable_or_traceable_url",
  "rights_classifiable",
  "answers_machine_verifiable",
] as const;
