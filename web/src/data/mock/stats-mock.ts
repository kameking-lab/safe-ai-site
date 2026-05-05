import type {
  StatsPeriod,
  StatsResponse,
  FeatureUsage,
  PageHit,
  TrafficSource,
  FlowStep,
  ConversionStats,
  ChatbotStats,
  Insight,
} from "@/lib/stats/types";

/**
 * /stats 用のモックデータ（GA4 未設定時のフォールバック）。
 * 数値は実運用に近いオーダーの暫定値で、期間（7d/30d/90d）でスケールする。
 */

const FEATURES_BASE: Array<Omit<FeatureUsage, "pv" | "avgSec" | "usageRate">> = [
  { id: "chatbot", name: "AIチャット（安衛法）", href: "/chatbot" },
  { id: "risk-prediction", name: "AIリスク予測", href: "/risk-prediction" },
  { id: "ky", name: "KY 用紙", href: "/ky" },
  { id: "accidents", name: "事故データベース", href: "/accidents" },
  { id: "laws", name: "法改正一覧", href: "/laws" },
  { id: "elearning", name: "Eラーニング", href: "/elearning" },
  { id: "safety-diary", name: "安全衛生日誌", href: "/safety-diary" },
];

function periodScale(p: StatsPeriod): number {
  if (p === "7d") return 1;
  if (p === "30d") return 4;
  return 11; // 90d ≒ 7d × 11 ぐらいで頭打ち
}

function buildSummary(p: StatsPeriod) {
  const k = periodScale(p);
  const dau = 142;
  const mau = p === "7d" ? 720 : p === "30d" ? 1840 : 3120;
  const pv = 4257 * k;
  return {
    dau,
    mau,
    pv,
    avgSessionSec: 184,
    bounceRate: 0.46,
    deltas: {
      dau: 8.2,
      mau: 12.4,
      pv: 15.6,
      avgSessionSec: 6.3,
      bounceRate: -3.1,
    },
  };
}

function buildFeatures(p: StatsPeriod): FeatureUsage[] {
  const k = periodScale(p);
  const factors: Array<{ pv: number; avgSec: number; rate: number }> = [
    { pv: 1280, avgSec: 312, rate: 0.62 },
    { pv: 540, avgSec: 268, rate: 0.34 },
    { pv: 720, avgSec: 195, rate: 0.42 },
    { pv: 980, avgSec: 218, rate: 0.51 },
    { pv: 860, avgSec: 152, rate: 0.45 },
    { pv: 320, avgSec: 408, rate: 0.18 },
    { pv: 280, avgSec: 245, rate: 0.16 },
  ];
  return FEATURES_BASE.map((f, idx) => ({
    ...f,
    pv: Math.round(factors[idx].pv * k),
    avgSec: factors[idx].avgSec,
    usageRate: factors[idx].rate,
  }));
}

function buildPages(p: StatsPeriod): PageHit[] {
  const k = periodScale(p);
  const items: Array<Omit<PageHit, "pv"> & { factor: number }> = [
    { url: "/", title: "トップページ", group: "home", avgSec: 92, factor: 2400 },
    { url: "/chatbot", title: "AIチャット（安衛法）", group: "chatbot", avgSec: 312, factor: 1280 },
    { url: "/accidents", title: "事故データベース", group: "accidents", avgSec: 218, factor: 980 },
    { url: "/laws", title: "法改正一覧", group: "laws", avgSec: 152, factor: 860 },
    { url: "/risk-prediction", title: "AIリスク予測", group: "risk-prediction", avgSec: 268, factor: 540 },
    { url: "/ky", title: "KY 用紙", group: "ky", avgSec: 195, factor: 720 },
    { url: "/elearning", title: "Eラーニング", group: "elearning", avgSec: 408, factor: 320 },
    { url: "/safety-diary", title: "安全衛生日誌", group: "safety-diary", avgSec: 245, factor: 280 },
    { url: "/laws/glossary", title: "法令用語集", group: "laws", avgSec: 134, factor: 240 },
    { url: "/about", title: "運営者情報", group: "about", avgSec: 86, factor: 210 },
  ];
  return items.map((it) => ({
    url: it.url,
    title: it.title,
    group: it.group,
    avgSec: it.avgSec,
    pv: Math.round(it.factor * k),
  }));
}

function buildSources(): TrafficSource[] {
  const arr: TrafficSource[] = [
    { source: "Google", sessions: 1820, pct: 0.58 },
    { source: "Direct", sessions: 642, pct: 0.2 },
    { source: "Bing", sessions: 218, pct: 0.07 },
    { source: "Yahoo!", sessions: 184, pct: 0.06 },
    { source: "Twitter/X", sessions: 142, pct: 0.045 },
    { source: "リファラ", sessions: 96, pct: 0.03 },
    { source: "その他", sessions: 38, pct: 0.015 },
  ];
  return arr;
}

function buildFlow(): FlowStep[] {
  return [
    { from: "/", to: "/chatbot", passRate: 0.34, users: 482 },
    { from: "/", to: "/accidents", passRate: 0.21, users: 298 },
    { from: "/", to: "/laws", passRate: 0.16, users: 226 },
    { from: "/chatbot", to: "/laws", passRate: 0.42, users: 202 },
    { from: "/accidents", to: "/risk-prediction", passRate: 0.28, users: 84 },
    { from: "/laws", to: "/laws/glossary", passRate: 0.31, users: 96 },
    { from: "/ky", to: "/elearning", passRate: 0.18, users: 38 },
  ];
}

function buildConversions(p: StatsPeriod): ConversionStats {
  const k = periodScale(p);
  const amazonClicks = 84 * k;
  const rakutenClicks = 42 * k;
  const totalClicks = amazonClicks + rakutenClicks;
  const impressions = 4200 * k;
  return {
    amazonClicks,
    rakutenClicks,
    ctr: totalClicks / impressions,
    byPage: [
      { url: "/accidents", title: "事故データベース", impressions: 980 * k, clicks: 42 * k, ctr: 0.043 },
      { url: "/ky", title: "KY 用紙", impressions: 720 * k, clicks: 28 * k, ctr: 0.039 },
      { url: "/risk-prediction", title: "AIリスク予測", impressions: 540 * k, clicks: 18 * k, ctr: 0.033 },
      { url: "/chatbot", title: "AIチャット", impressions: 1280 * k, clicks: 26 * k, ctr: 0.02 },
      { url: "/laws", title: "法改正一覧", impressions: 680 * k, clicks: 12 * k, ctr: 0.018 },
    ],
  };
}

function buildChatbot(p: StatsPeriod): ChatbotStats {
  const k = periodScale(p);
  return {
    totalQuestions: 1280 * k,
    avgResponseMs: 1240,
    byCategory: [
      { category: "墜落・高所", count: 320 * k },
      { category: "化学物質", count: 256 * k },
      { category: "健康診断", count: 198 * k },
      { category: "教育・特別教育", count: 178 * k },
      { category: "クレーン・揚重", count: 142 * k },
      { category: "ハラスメント", count: 96 * k },
      { category: "労災・補償", count: 60 * k },
      { category: "その他", count: 30 * k },
    ],
  };
}

function buildInsights(): Insight {
  return {
    unusedFeatures: [
      {
        id: "safety-diary",
        name: "安全衛生日誌",
        pv: 280,
        suggestion: "トップ動線の弱さが疑われる。KY/事故DBからの導線追加を検討。",
      },
      {
        id: "elearning",
        name: "Eラーニング",
        pv: 320,
        suggestion: "学習動機が薄い。資格取得カテゴリへの誘導 CTA を強化。",
      },
      {
        id: "ky",
        name: "KY 用紙",
        pv: 720,
        suggestion: "セッション時間は短い。テンプレ閲覧で離脱しているため、保存→共有 UX の改善余地あり。",
      },
    ],
    growingFeatures: [
      { id: "chatbot", name: "AIチャット（安衛法）", growthPct: 38.4 },
      { id: "accidents", name: "事故データベース", growthPct: 22.1 },
      { id: "risk-prediction", name: "AIリスク予測", growthPct: 14.8 },
    ],
    summary:
      "AIチャットへの集中（PV/セッション最長）に対し、日誌・E ラーニングは未到達。事故DB → リスク予測の導線がボトルネック。",
  };
}

export function buildMockStatsResponse(period: StatsPeriod): StatsResponse {
  return {
    period,
    source: "mock",
    generatedAt: new Date().toISOString(),
    summary: buildSummary(period),
    features: buildFeatures(period),
    pages: buildPages(period),
    sources: buildSources(),
    flow: buildFlow(),
    conversions: buildConversions(period),
    chatbot: buildChatbot(period),
    insights: buildInsights(),
  };
}
