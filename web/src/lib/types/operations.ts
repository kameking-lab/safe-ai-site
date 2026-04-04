export type NotificationSettingKey =
  | "weatherAlerts"
  | "lawRevisions"
  | "accidentUpdates"
  | "morningReminder";

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

export type KyInstructionRecordState = {
  reportStamps: [string, string, string, string, string];
  workDateYear: string;
  workDateMonth: string;
  workDateDay: string;
  workDateNote: string;
  weather: string;
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
};
