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
