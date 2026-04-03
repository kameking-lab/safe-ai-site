export type RevisionKind = "law" | "ordinance" | "notice" | "guideline" | "other";

export type RevisionCategory =
  | "労働安全衛生法"
  | "省令"
  | "通達"
  | "告示"
  | "指針"
  | "ガイドライン"
  | string;

export type RevisionSource = {
  url?: string;
  label?: string;
};

export type LawRevisionCore = {
  id: string;
  title: string;
  publishedAt: string;
  revisionNumber: string;
  category: RevisionCategory;
  kind: RevisionKind;
  issuer: string;
  summary: string;
  source?: RevisionSource;
};

export type LawRevisionSummary = {
  threeLineSummary: [string, string, string];
  workplaceActions: string[];
  targetIndustries: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatReplyRule = {
  keywords: string[];
  response: string;
};

export type WeatherAlertLevel = "advisory" | "warning";
export type WeatherRiskLevel = "低" | "中" | "高";

export type WeatherAlert = {
  type: string;
  level: WeatherAlertLevel;
};

export type WeatherSnapshot = {
  regionName: string;
  date: string;
  overview: string;
  temperatureCelsius: number;
  windSpeedMs: number;
  precipitationMm: number;
  alerts: WeatherAlert[];
};

export type SiteRiskWeather = {
  regionName: string;
  date: string;
  overview: string;
  temperatureCelsius: number;
  windSpeedMs: number;
  precipitationMm: number;
  alerts: WeatherAlert[];
  riskLevel: WeatherRiskLevel;
  primaryCautions: string[];
  riskEvidences: string[];
  recommendedActions: string[];
};

export type AccidentType = "墜落" | "転倒" | "挟まれ" | "飛来落下" | "感電";
export type AccidentWorkCategory = "高所" | "電気" | "足場" | "重機" | "一般";

export type AccidentCase = {
  id: string;
  title: string;
  occurredOn: string;
  type: AccidentType;
  workCategory: AccidentWorkCategory;
  severity: "軽傷" | "中等傷" | "重傷";
  summary: string;
  mainCauses: string[];
  preventionPoints: string[];
};

// API接続時に差し替えしやすいよう、UI側はこの別名を利用する。
export type LawRevision = LawRevisionCore;
export type RevisionSummary = LawRevisionSummary;
export type SummaryContent = LawRevisionSummary;
