/**
 * /stats 公開ダッシュボードの型定義（GA4 / モック共通）。
 *
 * 8 セクション構成:
 *  1. summary    : DAU / MAU / PV / 平均セッション時間 / 直帰率
 *  2. features   : 7 目玉機能の利用状況
 *  3. pages      : ページ別アクセス上位 10 件
 *  4. sources    : 流入元
 *  5. flow       : ユーザー導線（from→to 通過率）
 *  6. conversions: アフィリエイトクリック / CTR
 *  7. chatbot    : AI 質問数 / 応答時間 / カテゴリ分布
 *  8. insights   : 改善判断インサイト
 */

export type StatsPeriod = "7d" | "30d" | "90d";

export type StatsSummary = {
  dau: number;
  mau: number;
  pv: number;
  /** 平均セッション時間（秒） */
  avgSessionSec: number;
  /** 直帰率（0.0–1.0） */
  bounceRate: number;
  /** 各指標の前期間比（％。マイナスもあり） */
  deltas: {
    dau: number;
    mau: number;
    pv: number;
    avgSessionSec: number;
    bounceRate: number;
  };
};

export type FeatureUsage = {
  id: string;
  name: string;
  href: string;
  pv: number;
  /** 平均滞在時間（秒） */
  avgSec: number;
  /** 利用率（DAU 比、0.0–1.0） */
  usageRate: number;
};

export type PageHit = {
  url: string;
  title: string;
  pv: number;
  avgSec: number;
  /** 機能グループ（chatbot, accidents, etc.） */
  group?: string;
};

export type TrafficSource = {
  source: string;
  sessions: number;
  pct: number;
};

export type FlowStep = {
  from: string;
  to: string;
  /** from に着地したユーザーのうち to に到達した割合（0.0–1.0） */
  passRate: number;
  users: number;
};

export type ConversionStats = {
  amazonClicks: number;
  rakutenClicks: number;
  /** affiliate CTR（クリック / アフィリエイト掲出 PV） */
  ctr: number;
  /** ページ別 CTR 上位 */
  byPage: Array<{
    url: string;
    title: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
};

export type ChatbotStats = {
  totalQuestions: number;
  /** 平均応答時間（ms） */
  avgResponseMs: number;
  byCategory: Array<{ category: string; count: number }>;
};

export type Insight = {
  /** 利用が低い機能 TOP3 */
  unusedFeatures: Array<{ id: string; name: string; pv: number; suggestion: string }>;
  /** 急成長機能 TOP3 */
  growingFeatures: Array<{ id: string; name: string; growthPct: number }>;
  /** 一行サマリ */
  summary: string;
};

export type StatsResponse = {
  period: StatsPeriod;
  /** "ga4" or "mock" */
  source: "ga4" | "mock";
  generatedAt: string;
  summary: StatsSummary;
  features: FeatureUsage[];
  pages: PageHit[];
  sources: TrafficSource[];
  flow: FlowStep[];
  conversions: ConversionStats;
  chatbot: ChatbotStats;
  insights: Insight;
};

/**
 * Google Search Console — SEO performance signals exposed at /api/search-console.
 *
 *  - summary: aggregate impressions / clicks / CTR / position over the period.
 *  - queries: top search queries that brought visitors to the site.
 *  - pages: top landing pages ranked by clicks.
 *  - countries: country breakdown (top 10).
 *  - devices: device-category breakdown (mobile / desktop / tablet).
 */
export type SearchConsoleSummary = {
  impressions: number;
  clicks: number;
  /** click-through rate, 0.0–1.0 */
  ctr: number;
  /** average ranking position; smaller is better */
  position: number;
};

export type SearchConsoleQueryRow = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type SearchConsolePageRow = {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type SearchConsoleCountryRow = {
  country: string;
  impressions: number;
  clicks: number;
};

export type SearchConsoleDeviceRow = {
  device: "MOBILE" | "DESKTOP" | "TABLET" | string;
  impressions: number;
  clicks: number;
};

export type SearchConsoleResponse = {
  period: StatsPeriod;
  /** "gsc" when the live API answered, otherwise "mock". */
  source: "gsc" | "mock";
  generatedAt: string;
  /** Site property used (https URL or sc-domain: form). Empty when unknown. */
  siteUrl: string;
  summary: SearchConsoleSummary;
  queries: SearchConsoleQueryRow[];
  pages: SearchConsolePageRow[];
  countries: SearchConsoleCountryRow[];
  devices: SearchConsoleDeviceRow[];
  /** Set when the live API was attempted and rejected, surfaced to the UI. */
  error?: string;
};

/**
 * GA4 page-analytics expansion — exposed at /api/stats/page-analytics.
 * The original /api/stats already returns a top-10 page list; this endpoint
 * adds engagement / device / referral breakdowns used by the SEO dashboard.
 */
export type PageAnalyticsPage = {
  url: string;
  title: string;
  pv: number;
  avgSec: number;
  /** engagement rate 0.0–1.0 */
  engagementRate: number;
  /** bounce rate 0.0–1.0 */
  bounceRate: number;
};

export type EngagementMetrics = {
  engagementRate: number;
  avgSessionSec: number;
  pagesPerSession: number;
};

export type DeviceShare = {
  device: string;
  sessions: number;
  pct: number;
};

export type ReferralRow = {
  source: string;
  medium: string;
  sessions: number;
};

export type PageAnalyticsResponse = {
  period: StatsPeriod;
  source: "ga4" | "mock";
  generatedAt: string;
  pages: PageAnalyticsPage[];
  engagement: EngagementMetrics;
  devices: DeviceShare[];
  referrals: ReferralRow[];
  error?: string;
};
