/**
 * Per-industry accident report data layer.
 *
 * Builds aggregate insights (severity mix, accident-type ranking, monthly
 * seasonality, cause patterns, year-over-year delta) for the 5 industries
 * covered by /accidents-reports/[industry]. All inputs come from the
 * existing combined dataset (loadCombinedCases) plus the curated subset
 * (getAccidentCasesDataset) for cause/prevention narrative depth.
 *
 * The module is server-only: it reads JSON / JSONL via the loader, and is
 * imported only from server components on the report routes.
 */

import { loadCombinedCases, type CombinedCase } from "@/lib/accidents-analytics/loader";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { AccidentCase, AccidentWorkCategory } from "@/lib/types/domain";
import type { IndustrySlug as _IndustrySlug } from "@/lib/industry-slugs";

/* ------------------------------------------------------------------ */
/* Industry registry                                                   */
/* ------------------------------------------------------------------ */

// Re-exported from the canonical source so consumers can import from either path.
export type IndustrySlug = _IndustrySlug;

/**
 * Industry config used by the report routes.
 *
 * `workCategory` matches the canonical AccidentWorkCategory used by the
 * curated dataset; `mhlwLabels` covers the broader strings seen in the
 * MHLW deaths feeds (compact.json, records-2024.jsonl) so the filter
 * works against the combined 5,000+ case dataset, not just curated.
 */
export type IndustryConfig = {
  slug: IndustrySlug;
  /** Canonical Japanese label shown in the UI */
  label: string;
  /** English label for OG / hreflang */
  labelEn: string;
  /** Short Japanese description for cards / SEO */
  tagline: string;
  /** Brand color (Tailwind class fragment) */
  colorClass: string;
  /** Emoji used on cards and headings */
  icon: string;
  /** Canonical AccidentWorkCategory value */
  workCategory: AccidentWorkCategory;
  /** All industry strings (curated + MHLW feeds) that map to this bucket */
  matchLabels: readonly string[];
  /** Hazard archetypes called out in the report intro */
  archetypes: readonly string[];
  /** Top OSH laws / ordinances relevant to this industry */
  laws: readonly { name: string; scope: string }[];
};

export const INDUSTRY_CONFIGS: readonly IndustryConfig[] = [
  {
    slug: "construction",
    label: "建設業",
    labelEn: "Construction",
    tagline: "墜落・転落・はさまれを中心に死亡災害の最多業種",
    colorClass: "amber",
    icon: "🏗",
    workCategory: "建設業",
    matchLabels: ["建設業", "建設", "土木工事業", "建築工事業", "その他の建設業"],
    archetypes: [
      "足場・屋根からの墜落",
      "重機との接触・はさまれ",
      "クレーン吊荷の落下",
      "土砂崩壊・倒壊",
    ],
    laws: [
      { name: "労働安全衛生法 第14条 / 第60条", scope: "作業主任者・職長教育" },
      { name: "労働安全衛生規則 第518条〜第533条", scope: "墜落防止・足場" },
      { name: "クレーン等安全規則", scope: "玉掛け・吊荷" },
    ],
  },
  {
    slug: "manufacturing",
    label: "製造業",
    labelEn: "Manufacturing",
    tagline: "機械への巻き込まれ・はさまれが多発する加工現場",
    colorClass: "blue",
    icon: "🏭",
    workCategory: "製造業",
    matchLabels: [
      "製造業",
      "製造",
      "食料品製造業",
      "金属製品製造業",
      "機械器具製造業",
      "化学工業",
      "窯業土石製品製造業",
      "木材・木製品製造業",
      "紙・パルプ製造業",
      "印刷・製本業",
      "輸送用機械器具製造業",
      "電気機械器具製造業",
    ],
    archetypes: [
      "プレス機・ローラーへの巻き込まれ",
      "回転工具による切創",
      "高温・有害物との接触",
      "フォークリフトとの接触",
    ],
    laws: [
      { name: "労働安全衛生規則 第101条〜第151条", scope: "機械等の覆い・囲い" },
      { name: "機械の包括的な安全基準に関する指針", scope: "リスクアセスメント" },
      { name: "化学物質管理者選任義務（安衛則 第12条の5）", scope: "化学物質取扱い" },
    ],
  },
  {
    slug: "transport",
    label: "運輸業",
    labelEn: "Transport & Logistics",
    tagline: "荷役・運転中の交通事故と腰痛・転倒が並ぶ",
    colorClass: "emerald",
    icon: "🚚",
    workCategory: "運輸交通業",
    matchLabels: [
      "運輸交通業",
      "陸上貨物運送事業",
      "運輸業",
      "道路貨物運送業",
      "鉄道・軌道業",
      "水運業",
      "航空運輸業",
      "倉庫業",
    ],
    archetypes: [
      "トラック荷台からの墜落",
      "フォークリフト・荷崩れ",
      "運行中の交通事故",
      "腰痛・反動動作",
    ],
    laws: [
      { name: "労働安全衛生規則 第151条の3〜第151条の82", scope: "車両系荷役運搬機械" },
      { name: "陸上貨物運送事業労働災害防止規程", scope: "荷役・墜落防止" },
      { name: "改善基準告示", scope: "拘束時間・運転労働" },
    ],
  },
  {
    slug: "healthcare",
    label: "医療・福祉",
    labelEn: "Healthcare & Welfare",
    tagline: "腰痛・転倒・暴力に加え感染症リスクが大きい",
    colorClass: "rose",
    icon: "🏥",
    workCategory: "保健衛生業",
    matchLabels: [
      "保健衛生業",
      "医療保健業",
      "社会福祉施設",
      "医療・福祉",
      "介護事業",
      "病院",
      "老人福祉・介護事業",
    ],
    archetypes: [
      "移乗介助による腰痛",
      "施設内での転倒",
      "針刺し・感染暴露",
      "利用者からの暴力・腰痛",
    ],
    laws: [
      { name: "職場における腰痛予防対策指針", scope: "介護・看護動作" },
      { name: "労働安全衛生規則 第32条〜第36条", scope: "健康管理・健診" },
      { name: "感染症の予防及び感染症の患者に対する医療に関する法律", scope: "感染防止" },
    ],
  },
  {
    slug: "service",
    label: "サービス業",
    labelEn: "Service Industry",
    tagline: "転倒・切創・熱中症が幅広い業態で発生",
    colorClass: "violet",
    icon: "🛎",
    workCategory: "その他の事業",
    matchLabels: [
      "その他の事業",
      "商業",
      "卸売業・小売業",
      "飲食店",
      "宿泊業",
      "ビルメンテナンス業",
      "清掃・と畜業",
      "教育・研究業",
      "理容・美容・浴場業",
      "娯楽業",
    ],
    archetypes: [
      "店舗・厨房での転倒",
      "刃物・調理機器による切創",
      "屋外作業の熱中症",
      "客対応中のハラスメント",
    ],
    laws: [
      { name: "労働安全衛生規則 第544条〜第548条", scope: "通路・床面" },
      { name: "労働基準法 第64条の3", scope: "妊産婦・年少者の就業制限" },
      { name: "職場における熱中症予防基本対策要綱", scope: "屋外・厨房作業" },
    ],
  },
] as const;

const SLUG_TO_CONFIG: Record<IndustrySlug, IndustryConfig> = Object.fromEntries(
  INDUSTRY_CONFIGS.map((c) => [c.slug, c]),
) as Record<IndustrySlug, IndustryConfig>;

export function getIndustryConfig(slug: string): IndustryConfig | undefined {
  return SLUG_TO_CONFIG[slug as IndustrySlug];
}

export function listIndustries(): readonly IndustryConfig[] {
  return INDUSTRY_CONFIGS;
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Map a free-form industry string (from MHLW feeds or curated cases)
 * to one of our 5 report buckets. Returns undefined when the input
 * doesn't belong to any of the supported buckets — those cases are
 * folded into the "全業種" totals but not into per-industry pages.
 */
export function normaliseIndustry(raw: string | null | undefined): IndustrySlug | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  for (const c of INDUSTRY_CONFIGS) {
    if (c.matchLabels.some((lbl) => trimmed === lbl || trimmed.includes(lbl))) {
      return c.slug;
    }
  }
  // Substring fallback for unanticipated MHLW labels (e.g. "鉄鋼業")
  if (/建設|土木|建築|塗装/.test(trimmed)) return "construction";
  if (/製造|加工|窯業|鉄鋼|金属/.test(trimmed)) return "manufacturing";
  if (/運輸|運送|倉庫|貨物|物流/.test(trimmed)) return "transport";
  if (/医療|福祉|看護|介護|衛生|保健/.test(trimmed)) return "healthcare";
  if (/商業|小売|卸|飲食|宿泊|サービス|清掃|理容|美容|娯楽|教育/.test(trimmed)) return "service";
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Cached per-industry slices                                          */
/* ------------------------------------------------------------------ */

type IndustrySlice = {
  /** All combined cases (MHLW deaths + curated) belonging to this industry */
  combined: CombinedCase[];
  /** Curated subset only — has mainCauses / preventionPoints */
  curated: AccidentCase[];
};

let sliceCache: Record<IndustrySlug, IndustrySlice> | null = null;

function buildSlices(): Record<IndustrySlug, IndustrySlice> {
  const combined = loadCombinedCases();
  const curated = getAccidentCasesDataset();

  const empty = (): IndustrySlice => ({ combined: [], curated: [] });
  const out: Record<IndustrySlug, IndustrySlice> = {
    construction: empty(),
    manufacturing: empty(),
    transport: empty(),
    healthcare: empty(),
    service: empty(),
  };

  for (const c of combined) {
    const slug = normaliseIndustry(c.industry) ?? normaliseIndustry(c.industryMedium);
    if (!slug) continue;
    out[slug].combined.push(c);
  }

  for (const c of curated) {
    const slug = normaliseIndustry(c.workCategory) ?? normaliseIndustry(c.industry_detail);
    if (!slug) continue;
    out[slug].curated.push(c);
  }

  return out;
}

function getSlice(slug: IndustrySlug): IndustrySlice {
  if (!sliceCache) sliceCache = buildSlices();
  return sliceCache[slug];
}

/* ------------------------------------------------------------------ */
/* Aggregations                                                        */
/* ------------------------------------------------------------------ */

export type NameCount = { name: string; count: number; share: number };
export type MonthCount = { month: number; count: number };
export type YearCount = { year: number; count: number };
export type SeverityBreakdown = {
  fatal: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
};

export type IndustryStats = {
  total: number;
  totalCombined: number;
  totalCurated: number;
  yearRange: { min: number; max: number };
  severity: SeverityBreakdown;
  fatalityShareOfAll: number;
};

function countShare<T>(items: T[], keyOf: (it: T) => string | null | undefined): NameCount[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const it of items) {
    const k = keyOf(it);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

function ranged(years: number[]): { min: number; max: number } {
  const valid = years.filter((y) => y > 0);
  if (valid.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...valid), max: Math.max(...valid) };
}

export function getIndustryStats(slug: IndustrySlug): IndustryStats {
  const slice = getSlice(slug);
  const combinedAll = loadCombinedCases();

  let fatal = 0;
  let serious = 0;
  let moderate = 0;
  let minor = 0;
  for (const c of slice.combined) {
    switch (c.severity) {
      case "死亡":
        fatal += 1;
        break;
      case "重傷":
        serious += 1;
        break;
      case "中等傷":
        moderate += 1;
        break;
      case "軽傷":
        minor += 1;
        break;
    }
  }

  const total = slice.combined.length;
  const allFatal = combinedAll.filter((c) => c.severity === "死亡").length;

  return {
    total,
    totalCombined: slice.combined.length,
    totalCurated: slice.curated.length,
    yearRange: ranged(slice.combined.map((c) => c.year)),
    severity: { fatal, serious, moderate, minor, total },
    fatalityShareOfAll: allFatal > 0 ? fatal / allFatal : 0,
  };
}

/**
 * Top N most frequent accident types in this industry. Type comes from
 * the combined dataset (covers 5,000+ MHLW deaths + curated).
 */
export function getTopAccidentTypes(slug: IndustrySlug, limit = 10): NameCount[] {
  return countShare(getSlice(slug).combined, (c) => c.type).slice(0, limit);
}

/**
 * Top N causes. Combined dataset exposes a single `cause` field; for the
 * curated subset we expand into all `mainCauses` so multi-cause cases
 * are reflected proportionally.
 */
export function getTopCauses(slug: IndustrySlug, limit = 10): NameCount[] {
  const slice = getSlice(slug);
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of slice.combined) {
    if (c.source === "curated") continue; // handled below with full mainCauses
    if (!c.cause) continue;
    counts.set(c.cause, (counts.get(c.cause) ?? 0) + 1);
    total += 1;
  }
  for (const c of slice.curated) {
    for (const cause of c.mainCauses) {
      const k = cause.trim();
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      total += 1;
    }
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, share: count / total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Curated-only: top recommended prevention points across the slice.
 * These come from real cases so they are concrete, not generic.
 */
export function getTopPreventionPoints(slug: IndustrySlug, limit = 12): NameCount[] {
  const slice = getSlice(slug);
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of slice.curated) {
    for (const p of c.preventionPoints) {
      const k = p.trim();
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      total += 1;
    }
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, share: count / total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Monthly seasonality (1-12). Counts every case regardless of year so
 * the chart reads as "which months have higher accident counts overall".
 */
export function getMonthlySeasonality(slug: IndustrySlug): MonthCount[] {
  const buckets = new Array<number>(12).fill(0);
  for (const c of getSlice(slug).combined) {
    if (!c.month) continue;
    buckets[c.month - 1] += 1;
  }
  return buckets.map((count, idx) => ({ month: idx + 1, count }));
}

/**
 * Cases per year for the industry, ascending year order.
 */
export function getYearTrend(slug: IndustrySlug): YearCount[] {
  const counts = new Map<number, number>();
  for (const c of getSlice(slug).combined) {
    if (c.year <= 0) continue;
    counts.set(c.year, (counts.get(c.year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Year-over-year delta vs prior year. Uses the two most recent years
 * with data; returns 0 when only one year is available.
 */
export type YoYDelta = {
  latestYear: number;
  latestCount: number;
  previousYear: number;
  previousCount: number;
  deltaPct: number;
};

export function getYoYDelta(slug: IndustrySlug): YoYDelta | null {
  const trend = getYearTrend(slug);
  if (trend.length < 2) return null;
  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const deltaPct = previous.count === 0 ? 0 : (latest.count - previous.count) / previous.count;
  return {
    latestYear: latest.year,
    latestCount: latest.count,
    previousYear: previous.year,
    previousCount: previous.count,
    deltaPct,
  };
}

/**
 * Common pattern = accident-type + dominant cause pair, ordered by
 * frequency. Surfaces industry-specific scenarios beyond a flat ranking.
 */
export type CommonPattern = {
  type: string;
  cause: string;
  count: number;
  share: number;
};

export function getCommonPatterns(slug: IndustrySlug, limit = 8): CommonPattern[] {
  const slice = getSlice(slug);
  const counts = new Map<string, { type: string; cause: string; count: number }>();
  let total = 0;
  for (const c of slice.combined) {
    if (!c.type || !c.cause) continue;
    const key = `${c.type}::${c.cause}`;
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { type: c.type, cause: c.cause, count: 1 });
    }
    total += 1;
  }
  if (total === 0) return [];
  return [...counts.values()]
    .map((p) => ({ ...p, share: p.count / total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Top curated cases for narrative depth. Curated cases include full
 * cause/prevention text; we sort by severity then recency.
 */
const SEVERITY_RANK: Record<AccidentCase["severity"], number> = {
  死亡: 4,
  重傷: 3,
  中等傷: 2,
  軽傷: 1,
};

function severityRank(c: AccidentCase): number {
  return SEVERITY_RANK[c.severity] ?? 0;
}

function occurredKey(occurredOn: string | undefined): number {
  if (!occurredOn) return 0;
  const m = occurredOn.match(/(\d{4})\D*(\d{1,2})?\D*(\d{1,2})?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 10000 + Number(m[2] ?? 1) * 100 + Number(m[3] ?? 1);
}

export function getTopCases(slug: IndustrySlug, limit = 5): AccidentCase[] {
  return [...getSlice(slug).curated]
    .sort((a, b) => {
      const rs = severityRank(b) - severityRank(a);
      if (rs !== 0) return rs;
      return occurredKey(b.occurredOn) - occurredKey(a.occurredOn);
    })
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* All-industries summary (used by hub page)                           */
/* ------------------------------------------------------------------ */

export type AllIndustriesSummary = {
  totalCombined: number;
  totalCurated: number;
  industries: {
    slug: IndustrySlug;
    label: string;
    icon: string;
    tagline: string;
    colorClass: string;
    total: number;
    fatal: number;
    topType: string | null;
  }[];
  yearRange: { min: number; max: number };
};

export function getAllIndustriesSummary(): AllIndustriesSummary {
  const combined = loadCombinedCases();
  const curated = getAccidentCasesDataset();

  const industries = INDUSTRY_CONFIGS.map((cfg) => {
    const stats = getIndustryStats(cfg.slug);
    const topType = getTopAccidentTypes(cfg.slug, 1)[0]?.name ?? null;
    return {
      slug: cfg.slug,
      label: cfg.label,
      icon: cfg.icon,
      tagline: cfg.tagline,
      colorClass: cfg.colorClass,
      total: stats.total,
      fatal: stats.severity.fatal,
      topType,
    };
  });

  return {
    totalCombined: combined.length,
    totalCurated: curated.length,
    industries,
    yearRange: ranged(combined.map((c) => c.year)),
  };
}

/* ------------------------------------------------------------------ */
/* Report DTO (composed for the page)                                  */
/* ------------------------------------------------------------------ */

export type IndustryReport = {
  config: IndustryConfig;
  stats: IndustryStats;
  topTypes: NameCount[];
  topCauses: NameCount[];
  topPrevention: NameCount[];
  seasonality: MonthCount[];
  yearTrend: YearCount[];
  yoy: YoYDelta | null;
  patterns: CommonPattern[];
  topCases: AccidentCase[];
};

export function getIndustryReport(slug: IndustrySlug): IndustryReport | null {
  const config = getIndustryConfig(slug);
  if (!config) return null;
  return {
    config,
    stats: getIndustryStats(slug),
    topTypes: getTopAccidentTypes(slug, 10),
    topCauses: getTopCauses(slug, 10),
    topPrevention: getTopPreventionPoints(slug, 12),
    seasonality: getMonthlySeasonality(slug),
    yearTrend: getYearTrend(slug),
    yoy: getYoYDelta(slug),
    patterns: getCommonPatterns(slug, 8),
    topCases: getTopCases(slug, 5),
  };
}
