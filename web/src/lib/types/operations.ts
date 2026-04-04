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
