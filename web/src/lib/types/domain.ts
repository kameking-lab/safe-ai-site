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

export type IndustryTag =
  | "construction"
  | "manufacturing"
  | "healthcare"
  | "transport"
  | "forestry"
  | "food"
  | "retail"
  | "cleaning"
  | "chemical"
  | "electrical";

export const ALL_INDUSTRY_TAGS: readonly IndustryTag[] = [
  "construction",
  "manufacturing",
  "healthcare",
  "transport",
  "forestry",
  "food",
  "retail",
  "cleaning",
  "chemical",
  "electrical",
];

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
  /** 業種タグ（手動指定優先、未指定なら推定器が導出） */
  industry_tags?: IndustryTag[];
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

/**
 * 事故の型（厚労省「労働災害動向調査」分類に準拠）。
 * 旧表記（「挟まれ」「崩壊」「中毒」「飛来落下」「高温物との接触」）は
 * 正規化後の値へ段階的に移行したため、互換性のため残している。
 */
export type AccidentType =
  | "墜落"
  | "転倒"
  | "はさまれ・巻き込まれ"
  | "切れ・こすれ"
  | "飛来・落下"
  | "感電"
  | "車両"
  | "交通事故"
  | "崩壊・倒壊"
  | "火災"
  | "爆発"
  | "高温・低温の物との接触"
  | "有害物等との接触"
  | "酸素欠乏"
  | "溺水"
  | "熱中症"
  | "低体温症"
  | "有害光線"
  | "有害物質"
  | "激突され"
  | "振動障害"
  | "動作の反動・無理な動作";

/**
 * 業種分類（厚労省「労働災害統計」区分に準拠）。
 * 旧データの具体業種（製造／建設／介護など）は建設業・製造業・保健衛生業・
 * その他の事業へ統合している。
 */
export type AccidentWorkCategory =
  | "建設業"
  | "製造業"
  | "運輸交通業"
  | "商業"
  | "保健衛生業"
  | "林業"
  | "電気業"
  | "化学"
  | "その他の事業";

/** UIの並び順（フィルタ用） */
export const ALL_ACCIDENT_TYPES: AccidentType[] = [
  "墜落",
  "転倒",
  "はさまれ・巻き込まれ",
  "激突され",
  "切れ・こすれ",
  "飛来・落下",
  "崩壊・倒壊",
  "感電",
  "車両",
  "交通事故",
  "火災",
  "爆発",
  "高温・低温の物との接触",
  "有害物等との接触",
  "酸素欠乏",
  "溺水",
  "熱中症",
  "低体温症",
  "有害光線",
  "有害物質",
  "振動障害",
  "動作の反動・無理な動作",
];

export const ALL_ACCIDENT_CATEGORIES: AccidentWorkCategory[] = [
  "建設業",
  "製造業",
  "運輸交通業",
  "商業",
  "保健衛生業",
  "林業",
  "電気業",
  "化学",
  "その他の事業",
];

export type AccidentSource = {
  /** 出典サイト名（例: 職場のあんぜんサイト） */
  site: string;
  /** 出典側の事例ID（判別できる場合） */
  caseId?: string;
  /** 事例ページへの直接URL */
  url?: string;
};

/**
 * 事故事例のデータ来源。UI 上の信頼性表示と統計集計の母集団切り分けに使う。
 *  - mhlw      : 厚労省「職場のあんぜんサイト」公開事例の再収録（id が mhlw-*）
 *  - curated     : 公開情報（労働局統計・報道・判例）に基づき編集部が再構成（固有名詞匿名化）
 *  - synthetic   : 教材用に編集部が合成した架空事例（カバレッジ補完目的）
 *  - preliminary : 厚労省速報集計値（業種別・事故型別合計）から導出した代表的パターン事例。
 *                  個票（個別報告書）ではなく集計統計に基づくため「速報」表示を必ずUIで明示。
 *                  確定値公開後は mhlw / curated に置き換える予定。
 */
export type AccidentProvenance = "mhlw" | "curated" | "synthetic" | "preliminary";

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
  /** 出典情報（職場のあんぜんサイト等） */
  source?: AccidentSource;
  /** データ来源（real/synthetic 切り分け）。未指定はアグリゲータで自動補完 */
  provenance?: AccidentProvenance;
};

// API接続時に差し替えしやすいよう、UI側はこの別名を利用する。
export type LawRevision = LawRevisionCore;
export type RevisionSummary = LawRevisionSummary;
export type SummaryContent = LawRevisionSummary;

/**
 * 報道RSS自動収集エントリの来源マーカー。完全自動運用（人的レビューなし）で
 * 取得・判定・公開されたエントリであることを明示し、UI上で公的データ
 * （mhlw / curated）と区別するために独立した provenance を割り当てる。
 */
export type NewsFeedProvenance = "news_auto";

export type NewsFeedSource = {
  /** 出典サイト名（例: "NHK NEWS WEB"） */
  name: string;
  /** 原典記事 URL（クリックで一次ソースへ誘導） */
  url: string;
  /** 発信元（例: "日本放送協会"） */
  publisher: string;
  /** 配信日時（ISO 8601, タイムゾーン込）。RSS に存在する場合のみ */
  publishedAt?: string;
  /** ETL 取得日時（ISO 8601） */
  fetchedAt: string;
};

/**
 * Gemini 2.5 Flash による自動判定スコア。承認基準:
 *  - relevance >= 70（労働災害関連性）
 *  - copyrightRisk <= 30（引用法32条遵守可否、低いほど安全）
 *  - misinformationRisk <= 30（一次ソース整合性、低いほど安全）
 *  - duplication <= 50（既存DB事例との重複度、高いほど重複）
 * 1 つでも外れたら自動却下し rejected/ に記録。
 */
export type NewsFeedAiScore = {
  relevance: number;
  copyrightRisk: number;
  misinformationRisk: number;
  duplication: number;
  /** 判定日時 ISO 8601 */
  judgedAt: string;
  /** 判定モデル名（例: "gemini-2.5-flash"） */
  model: string;
  /** 却下時のみ: 却下理由（人間可読、運用分析用） */
  rejectionReasons?: string[];
};

/**
 * AI が分類するニュース種別。2026-05-17 の精度監査で追加。
 * 行政発表・統計発表に対して duplication 軸を適用しないために用いる。
 */
export type NewsFeedNewsType =
  | "accident_report"
  | "administrative_notice"
  | "statistics_release"
  | "general_news"
  | "unknown";

export type NewsFeedEntry = {
  /** URL の SHA-256 ハッシュ（先頭16文字）。重複排除キー */
  id: string;
  /** 原文見出し（逐語、改変禁止） */
  headline: string;
  /** AI 独自要約（50字以内、原文言い回しを保持しない） */
  aiSummary: string;
  /** 出典情報（クリックで原典遷移） */
  source: NewsFeedSource;
  /** AI が推定した事故型（推定不能なら undefined） */
  estimatedAccidentType?: AccidentType;
  /** AI が推定した業種（推定不能なら undefined） */
  estimatedWorkCategory?: AccidentWorkCategory;
  /** AI が分類したニュース種別（2026-05-17 監査で追加、既存エントリは undefined） */
  newsType?: NewsFeedNewsType;
  /** 自動判定スコア */
  score: NewsFeedAiScore;
  /** 自動判定結果（true=承認/approved/, false=却下/rejected/） */
  approved: boolean;
  /** 来源マーカー */
  provenance: NewsFeedProvenance;
};

/** UI 側で扱う承認済みエントリのコレクション型 */
export type NewsFeedDataset = {
  /** 最終更新（ISO 8601, UTC） */
  updatedAt: string;
  /** 承認済みエントリ（occurredOn 降順、最新200件まで） */
  entries: NewsFeedEntry[];
};
