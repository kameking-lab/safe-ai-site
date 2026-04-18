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

export type RevisionImpact = "高" | "中" | "低";

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
  /** 影響度（現場への影響の大きさ） */
  impact?: RevisionImpact;
  /** 告示番号（例:「厚生労働省告示第XX号」。不明の場合は空文字""） */
  official_notice_number?: string;
  /** 施行日（YYYY-MM-DD形式。不明なら空文字""） */
  enforcement_date?: string;
  /** e-Gov直リンク（条文レベル。不明なら空文字""） */
  source_url?: string;
  /** 公布日（YYYY-MM-DD形式。不明なら空文字""） */
  publication_date?: string;
  /** 業種詳細（建設/製造/林業/運輸/医療福祉/食品/化学/電気/農業/サービス/小売/IT/全業種 等） */
  industry_detail?: string;
  /** 対象労働者属性（女性労働者/高齢者/外国人/非正規/若年/一般） */
  worker_attribute?: string[];
  /** 事業所規模（大企業/中小企業/個人事業主/全規模） */
  company_size?: string;
  /** 通達番号（例:「基発0115第1号」。不明なら空文字"" / 任意） */
  notice_no?: string;
  /** 厚労省通達検索または所管省庁の通達公開URL（任意） */
  notice_link?: string;
  /** 関連判例の事件番号（例:「最三小判平24.3.13」「最一小判平12.3.24」） */
  court_case?: string;
  /** 判例要旨（短文） */
  court_case_summary?: string;
  /** 判例の公式出典URL（裁判所サイト等） */
  court_case_url?: string;
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

export type AccidentType =
  | "墜落"
  | "転倒"
  | "挟まれ"
  | "はさまれ・巻き込まれ"
  | "巻き込まれ"
  | "切れ・こすれ"
  | "飛来落下"
  | "感電"
  | "車両"
  | "交通事故"
  | "崩壊"
  | "崩壊・倒壊"
  | "火災"
  | "爆発"
  | "中毒"
  | "酸素欠乏"
  | "溺水"
  | "熱中症"
  | "低体温症"
  | "高温物との接触"
  | "有害光線"
  | "有害物質"
  | "激突され"
  | "振動障害"
  | "動作の反動・無理な動作";

export type AccidentWorkCategory =
  | "高所"
  | "電気"
  | "足場"
  | "重機"
  | "一般"
  | "解体"
  | "製造"
  | "建設"
  | "倉庫"
  | "化学"
  | "林業"
  | "物流"
  | "造船"
  | "警備"
  | "造園"
  | "整備"
  | "縫製"
  | "小売"
  | "医療"
  | "介護"
  | "食品"
  | "運輸"
  | "清掃";

/** UIの並び順（フィルタ用） */
export const ALL_ACCIDENT_TYPES: AccidentType[] = [
  "墜落",
  "転倒",
  "挟まれ",
  "はさまれ・巻き込まれ",
  "巻き込まれ",
  "切れ・こすれ",
  "飛来落下",
  "感電",
  "車両",
  "交通事故",
  "崩壊",
  "崩壊・倒壊",
  "火災",
  "爆発",
  "中毒",
  "酸素欠乏",
  "溺水",
  "熱中症",
  "低体温症",
  "高温物との接触",
  "有害光線",
  "有害物質",
  "激突され",
  "振動障害",
  "動作の反動・無理な動作",
];

export const ALL_ACCIDENT_CATEGORIES: AccidentWorkCategory[] = [
  "高所",
  "電気",
  "足場",
  "重機",
  "一般",
  "解体",
  "製造",
  "建設",
  "倉庫",
  "化学",
  "林業",
  "物流",
  "造船",
  "警備",
  "造園",
  "整備",
  "縫製",
  "小売",
  "医療",
  "介護",
  "食品",
  "運輸",
  "清掃",
];

export type AccidentCase = {
  id: string;
  title: string;
  occurredOn: string;
  type: AccidentType;
  workCategory: AccidentWorkCategory;
  severity: "軽傷" | "中等傷" | "重傷" | "死亡";
  summary: string;
  mainCauses: string[];
  preventionPoints: string[];
  /** 業種詳細 */
  industry_detail?: string;
  /** 対象労働者属性 */
  worker_attribute?: string[];
  /** 事業所規模 */
  company_size?: string;
};

// API接続時に差し替えしやすいよう、UI側はこの別名を利用する。
export type LawRevision = LawRevisionCore;
export type RevisionSummary = LawRevisionSummary;
export type SummaryContent = LawRevisionSummary;
