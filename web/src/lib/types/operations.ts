import type { KyApproval } from "@/lib/ky/approval";

export type NotificationSettingKey =
  "weatherAlerts" | "lawRevisions" | "accidentUpdates" | "morningReminder";

export type NotificationSettings = {
  weatherAlerts: boolean;
  lawRevisions: boolean;
  accidentUpdates: boolean;
  morningReminder: boolean;
  reminderTime: string;
};

export type MailFrequency = "daily" | "weekly" | "only-alert";

export type MailDeliverySettings = {
  enabled: boolean;
  email: string;
  frequency: MailFrequency;
  includeWeather: boolean;
  includeLaws: boolean;
  includeAccidents: boolean;
  includeLearning: boolean;
};

export type LearningQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LearningTheme = {
  id: string;
  title: string;
  sourceType: "事故DB" | "法改正" | "現場リスク";
  description: string;
  level: "入門" | "標準" | "重点";
  questions: LearningQuestion[];
  /** 業種詳細 */
  industry_detail?: string;
  /** 対象労働者属性 */
  worker_attribute?: string[];
  /** 事業所規模 */
  company_size?: string;
};

export type KySheetDraft = {
  date: string;
  siteName: string;
  workSummary: string;
  expectedRisks: string;
  countermeasures: string;
  callAndResponse: string;
  notes: string;
};

export type PdfExportTarget = "ky-sheet" | "morning-briefing";

/** 危険予知活動（KY）用紙・紙フォーム相当 */
export type KyPaperRiskRow = {
  predictedHarm: string;
  magnitude: number;
  probability: number;
  evaluation: number;
  riskGrade: string;
  reductionMeasures: string;
  reMagnitude: number;
  reProbability: number;
  reEvaluation: number;
  reRiskGrade: string;
  reMeasures: string;
};

export type KyPaperFormState = {
  date: string;
  companyName: string;
  personInCharge: string;
  workContent: string;
  supervisorInstructions: string;
  rows: KyPaperRiskRow[];
  participantNames: string;
  pointingCall: string;
  siteAgentSign: string;
  supervisorSign: string;
};

/** 作業指示・安全指示書及び現地KY記録表（横長様式） */
export type KyInstructionWorkRow = {
  workPlace: string;
  workDetail: string;
  machinery: string;
  fireMark: string;
  heightMark: string;
  ppeNote: string;
  safetyInstruction: string;
  responsible: string;
  primeSign: string;
};

export type KyRiskCandidateSourceKind =
  | "ai"
  | "rule"
  | "workflowImport"
  | "officialAccident"
  | "curatedAccident"
  | "syntheticCase"
  | "preliminaryCase";

export type KyRiskCandidateSource = {
  kind: KyRiskCandidateSourceKind;
  label: string;
  referenceId?: string;
  referenceUrl?: string;
  /** AIが生成した理由。一次資料による主張支持とは区別する。 */
  basis?: string;
  /** 主張単位の引用支持を確認済みか。 */
  grounded?: boolean;
  /** retrievalで取得した例ID。主張支持を意味しない。 */
  retrievedExampleIds?: string[];
  /** retrievalで取得した一次資料URL。主張支持を意味しない。 */
  sourceUrls?: string[];
  /** 候補生成時刻。 */
  generatedAt?: string;
  /** 候補を帳票へ確定する前に、現場条件と根拠を人が確認する。 */
  requiresHumanReview: true;
};

export type KyInstructionRiskRow = {
  targetLabel: string;
  hazard: string;
  qualNo: string;
  likelihood: 1 | 2 | 3;
  severity: 1 | 2 | 3;
  reduction: string;
  reLikelihood: 1 | 2 | 3;
  reSeverity: 1 | 2 | 3;
  reducedBelow2: string;
  primeSign: string;
  /** AI・定型・事故DBから採用した候補の出所。利用者の直接入力では省略。 */
  candidateSource?: KyRiskCandidateSource;
  /** 候補について現場条件と根拠を確認した時刻。電子署名ではない。 */
  humanConfirmedAt?: string;
};

export type KyInstructionParticipant = {
  name: string;
  qualNo: string;
  preWork: string;
  onExit: string;
};

export type KyInstructionFallCheck = {
  good: string;
  bad: string;
  done: string;
};

export type KyInstructionContext = {
  workLocation: string;
  equipment: string;
  heavyEquipment: string;
  plannedPeopleCount: string;
  weather: string;
  simultaneousWork: string;
  changes: string;
  newEntrants: string;
  nightWork: string;
  chemicals: string;
  heatStress: string;
  reviewerName: string;
  reviewedAt?: string;
};

export type KyInstructionRecordState = {
  /** Authoritative local/cloud/export schema. */
  schemaVersion: 2;
  /** ISO creation time. Blank legacy values remain unreviewed until confirmed. */
  createdAt: string;
  /** YYYY-MM-DD date on which this KY applies. */
  applicableDate: string;
  /** Shared by input, persistence, AI preflight, print and export. */
  context: KyInstructionContext;
  reportStamps: [string, string, string, string, string];
  /** 現場名（紙KY用紙の標準項目。全面再設計で追加） */
  siteName: string;
  /** 工事名・工区 */
  projectName: string;
  /** 職長名（リーダー） */
  foremanName: string;
  workDateYear: string;
  workDateMonth: string;
  workDateDay: string;
  workDateNote: string;
  weather: string;
  /** 気温（℃）。天気自動取得で埋まる場合あり */
  temperature: string;
  coop1Name: string;
  coop1Chief: string;
  coop2Name: string;
  coop2Chief: string;
  coop3Name: string;
  coop3Chief: string;
  workRows: KyInstructionWorkRow[];
  riskRows: KyInstructionRiskRow[];
  participants: KyInstructionParticipant[];
  participantTotal: string;
  breaks: string[];
  safetyVest: string;
  exitLarge: string;
  exitMedium: string;
  exitSmall: string;
  closingNote: string;
  fallChecks: KyInstructionFallCheck[];
  correctionNote: string;
  /** 4R目標設定: チーム行動目標（「〜しよう」）。朝礼で唱和する核心項目 */
  teamGoal: string;
  /** 4R目標設定: 重点実施項目（必ずやること） */
  priorityItems: string;
  /** 指差呼称項目（「〜ヨシ！」）。朝礼サイネージで大表示する */
  pointingCall: string;
  /** 元請確認・承認の状態と履歴（P1-B）。未設定は draft 扱い */
  approval?: KyApproval;
};

/** KY記録一覧用のサマリー */
export type KyRecordSummary = {
  id: string;
  workDate: string;
  companyName: string;
  /** 現場名（一覧で記録を識別するために使用） */
  siteName: string;
  /** 工事名・工区 */
  projectName: string;
  /** 職長名 */
  foremanName: string;
  workDetail: string;
  weather: string;
  savedAt: string;
};
