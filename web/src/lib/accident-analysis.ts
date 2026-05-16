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

/* ------------------------------------------------------------------ */
/* Deeper analytics — time/size/severity mix                           */
/* ------------------------------------------------------------------ */

/**
 * Time-of-day distribution.
 *
 * MHLW deaths data carries `occurrenceTime` as a 2-hour bucket label
 * ("0～2", "2～4", ... "22～24"). We group those into 4 operationally
 * meaningful bands so the page shows "始業直後" / "午前" / "午後" /
 * "夜間・残業帯" rather than a flat 12-bucket histogram.
 */
export type TimeBand = "early-morning" | "morning" | "afternoon" | "night";
export type TimeBandCount = {
  band: TimeBand;
  label: string;
  range: string;
  count: number;
  share: number;
};

const TIME_BAND_LABEL: Record<TimeBand, { label: string; range: string }> = {
  "early-morning": { label: "始業帯 (6:00-10:00)", range: "6～10" },
  morning: { label: "午前 (10:00-12:00)", range: "10～12" },
  afternoon: { label: "午後 (12:00-18:00)", range: "12～18" },
  night: { label: "夜間・残業 (18:00-6:00)", range: "18～6" },
};

function bandOf(raw: string | null): TimeBand | null {
  if (!raw) return null;
  // raw looks like "8～10" or "18～20" or "10～12"
  const m = raw.match(/(\d{1,2})/);
  if (!m) return null;
  const start = Number(m[1]);
  if (Number.isNaN(start)) return null;
  if (start >= 6 && start < 10) return "early-morning";
  if (start >= 10 && start < 12) return "morning";
  if (start >= 12 && start < 18) return "afternoon";
  return "night";
}

export function getTimeBandDistribution(slug: IndustrySlug): TimeBandCount[] {
  const buckets: Record<TimeBand, number> = {
    "early-morning": 0,
    morning: 0,
    afternoon: 0,
    night: 0,
  };
  let total = 0;
  for (const c of getSlice(slug).combined) {
    const band = bandOf(c.occurrenceTime);
    if (!band) continue;
    buckets[band] += 1;
    total += 1;
  }
  const order: TimeBand[] = ["early-morning", "morning", "afternoon", "night"];
  return order.map((band) => ({
    band,
    label: TIME_BAND_LABEL[band].label,
    range: TIME_BAND_LABEL[band].range,
    count: buckets[band],
    share: total > 0 ? buckets[band] / total : 0,
  }));
}

/**
 * Workplace size distribution. MHLW labels use the format "10～29",
 * "1～9", "100～299" etc. We collapse them into 4 SME-relevant tiers
 * so the report tells a small/medium/large operations story.
 */
export type SizeTier = "micro" | "small" | "medium" | "large";
export type SizeTierCount = {
  tier: SizeTier;
  label: string;
  count: number;
  share: number;
};

const SIZE_TIER_LABEL: Record<SizeTier, string> = {
  micro: "1〜9人 (零細)",
  small: "10〜49人 (小規模)",
  medium: "50〜299人 (中規模)",
  large: "300人以上 (大規模)",
};

function tierOfSize(raw: string | null): SizeTier | null {
  if (!raw) return null;
  // raw can be "10～29", "1～9", "100～299", "300以上", or curated free text
  const m = raw.match(/(\d+)/);
  if (!m) return null;
  const start = Number(m[1]);
  if (Number.isNaN(start)) return null;
  if (start < 10) return "micro";
  if (start < 50) return "small";
  if (start < 300) return "medium";
  return "large";
}

export function getWorkplaceSizeDistribution(slug: IndustrySlug): SizeTierCount[] {
  const buckets: Record<SizeTier, number> = { micro: 0, small: 0, medium: 0, large: 0 };
  let total = 0;
  for (const c of getSlice(slug).combined) {
    const tier = tierOfSize(c.workplaceSize);
    if (!tier) continue;
    buckets[tier] += 1;
    total += 1;
  }
  const order: SizeTier[] = ["micro", "small", "medium", "large"];
  return order.map((tier) => ({
    tier,
    label: SIZE_TIER_LABEL[tier],
    count: buckets[tier],
    share: total > 0 ? buckets[tier] / total : 0,
  }));
}

/**
 * Severity ratio expressed in 労働安全衛生法 reporting terms:
 *  - 死亡 → 死亡災害
 *  - 重傷・中等傷 → 休業4日以上（事業者報告義務）
 *  - 軽傷 → 休業3日以下
 *
 * MHLW deaths feed entries are implicitly fatal, so the ratio is
 * essentially curated-driven; that is what we want — the curated subset
 * is the only source where non-fatal severities exist.
 */
export type SeverityRatio = {
  fatal: number;
  lostWorkday: number; // 休業4日以上 (重傷 + 中等傷)
  minor: number;
  total: number;
  fatalShare: number;
  lostWorkdayShare: number;
  minorShare: number;
};

export function getSeverityRatio(slug: IndustrySlug): SeverityRatio {
  const slice = getSlice(slug);
  let fatal = 0;
  let lostWorkday = 0;
  let minor = 0;
  for (const c of slice.combined) {
    if (c.severity === "死亡") fatal += 1;
    else if (c.severity === "重傷" || c.severity === "中等傷") lostWorkday += 1;
    else if (c.severity === "軽傷") minor += 1;
  }
  const total = fatal + lostWorkday + minor;
  return {
    fatal,
    lostWorkday,
    minor,
    total,
    fatalShare: total > 0 ? fatal / total : 0,
    lostWorkdayShare: total > 0 ? lostWorkday / total : 0,
    minorShare: total > 0 ? minor / total : 0,
  };
}

/**
 * Highlight the 3 worst months (by absolute count) and provide a
 * narrative tag classifying the season. Used for the seasonality
 * callout above the monthly chart.
 */
export type WorstMonth = {
  month: number;
  count: number;
  share: number;
  seasonTag: "夏季暑熱期" | "冬季寒冷期" | "梅雨期" | "年度切替期" | "繁忙期";
  hazardHint: string;
};

const SEASON_HINTS: Record<number, { tag: WorstMonth["seasonTag"]; hint: string }> = {
  1: { tag: "冬季寒冷期", hint: "凍結・転倒、暖房関連火災に注意" },
  2: { tag: "冬季寒冷期", hint: "凍結・転倒、低体温症リスク" },
  3: { tag: "年度切替期", hint: "工期繁忙・新人作業者の不慣れ" },
  4: { tag: "年度切替期", hint: "新人作業者・体制変更に伴う作業手順逸脱" },
  5: { tag: "繁忙期", hint: "屋外作業の本格化・連休明けの集中力低下" },
  6: { tag: "梅雨期", hint: "足元の濡れによる転倒、墜落作業の作業姿勢悪化" },
  7: { tag: "夏季暑熱期", hint: "熱中症・判断力低下による事故、夕立時の濡れ" },
  8: { tag: "夏季暑熱期", hint: "熱中症ピーク、夏季休業前後の引き継ぎ漏れ" },
  9: { tag: "夏季暑熱期", hint: "残暑による熱中症、台風前後の高所作業" },
  10: { tag: "繁忙期", hint: "年度後半の納期集中・残業多発" },
  11: { tag: "繁忙期", hint: "工期追い込み、年末工事の前倒し" },
  12: { tag: "繁忙期", hint: "年末工事の集中、寒冷化と疲労蓄積" },
};

export function getWorstMonths(slug: IndustrySlug, limit = 3): WorstMonth[] {
  const monthly = getMonthlySeasonality(slug);
  const total = monthly.reduce((s, m) => s + m.count, 0);
  return [...monthly]
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((m) => ({
      month: m.month,
      count: m.count,
      share: total > 0 ? m.count / total : 0,
      seasonTag: SEASON_HINTS[m.month].tag,
      hazardHint: SEASON_HINTS[m.month].hint,
    }));
}

/**
 * Multi-year monthly series for the recharts line chart. We keep the
 * latest N years where N defaults to 3 — enough for visual YoY pattern
 * comparison without overcrowding the chart on mobile.
 */
export type MonthlyByYear = {
  /** ISO month 1..12 */
  month: number;
  /** "1月", "2月", ... — for x-axis ticks */
  monthLabel: string;
  /** key = year (e.g. "2023"), value = count for that month */
  [year: string]: string | number;
};

export function getMonthlySeriesByYear(slug: IndustrySlug, years = 3): {
  rows: MonthlyByYear[];
  years: number[];
} {
  const trend = getYearTrend(slug);
  if (trend.length === 0) return { rows: [], years: [] };
  const selectedYears = trend.slice(-years).map((t) => t.year);

  // Initialise count grid: month 1..12 × selectedYears
  const grid: Record<number, Record<number, number>> = {};
  for (let m = 1; m <= 12; m += 1) {
    grid[m] = {};
    for (const y of selectedYears) grid[m][y] = 0;
  }
  for (const c of getSlice(slug).combined) {
    if (!c.month || c.year <= 0) continue;
    if (!selectedYears.includes(c.year)) continue;
    grid[c.month][c.year] += 1;
  }
  const rows: MonthlyByYear[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const row: MonthlyByYear = { month: m, monthLabel: `${m}月` };
    for (const y of selectedYears) row[String(y)] = grid[m][y];
    rows.push(row);
  }
  return { rows, years: selectedYears };
}

/**
 * Industry's top 5 "danger factors" derived from causes + matched
 * archetypes. The output mixes data-driven cause names with
 * editorialised explanations from the config so the section reads as
 * actionable rather than as a raw frequency dump.
 */
export type DangerFactor = {
  rank: number;
  factor: string;
  cause: string | null;
  count: number;
  share: number;
  hint: string;
};

const FACTOR_HINTS: Record<string, string> = {
  足場等: "足場の組立・解体・点検時の墜落リスク。組立等作業主任者の指揮下で実施。",
  仮設物: "仮設足場・親綱の不備による墜落。安衛則 第518条〜第533条 をチェック。",
  動力機械: "プレス・ローラー・回転体への巻き込まれ。光線式安全装置の作動確認。",
  運搬機械: "フォークリフト・クレーン関連。誘導者の配置と接触防止標識を徹底。",
  物上げ装置: "クレーン・揚重作業。玉掛者・運転者の資格と合図の取り決めを確認。",
  乗物: "業務車両運行中の交通事故。点呼・運行管理・改善基準告示遵守を確認。",
  環境等: "通路・床面・照度などの作業環境。整理整頓と滑り止め対策が基本。",
  材料: "資材落下や荷崩れ。荷の積み付け・固縛の徹底。",
  動作: "腰痛・反動動作。介助・荷役時の動作手順とアシスト機器の活用。",
};

function hintFor(cause: string, archetypes: readonly string[]): string {
  for (const key of Object.keys(FACTOR_HINTS)) {
    if (cause.includes(key)) return FACTOR_HINTS[key];
  }
  // Fall back to first archetype mention containing a keyword from the cause
  const head = cause.slice(0, 3);
  const matched = archetypes.find((a) => a.includes(head));
  return matched ?? `${cause}に関わる作業手順・教育・点検記録を再確認。`;
}

export function getDangerFactors(slug: IndustrySlug, limit = 5): DangerFactor[] {
  const config = getIndustryConfig(slug);
  if (!config) return [];
  const causes = getTopCauses(slug, limit);
  return causes.map((c, idx) => ({
    rank: idx + 1,
    factor: c.name,
    cause: c.name,
    count: c.count,
    share: c.share,
    hint: hintFor(c.name, config.archetypes),
  }));
}

/**
 * Cross-industry comparison: how this industry's fatal share compares
 * to the average across the 5 supported buckets. This is the "same
 * industry vs others" data we can compute from the existing dataset
 * without external benchmarks.
 */
export type IndustryComparison = {
  thisFatalCount: number;
  thisTotalCount: number;
  thisFatalRate: number; // fatal / total within industry
  avgFatalRate: number; // avg across other 4 industries
  rankByFatal: number; // 1 = highest fatal count
  totalIndustries: number;
};

export function getIndustryComparison(slug: IndustrySlug): IndustryComparison {
  const all = INDUSTRY_CONFIGS.map((cfg) => ({
    slug: cfg.slug,
    stats: getIndustryStats(cfg.slug),
  }));
  const self = all.find((a) => a.slug === slug)!;
  const others = all.filter((a) => a.slug !== slug);
  const otherRates = others
    .map((o) => (o.stats.total > 0 ? o.stats.severity.fatal / o.stats.total : 0))
    .filter((r) => r > 0);
  const avgFatalRate =
    otherRates.length > 0 ? otherRates.reduce((s, x) => s + x, 0) / otherRates.length : 0;
  const sortedByFatal = [...all].sort((a, b) => b.stats.severity.fatal - a.stats.severity.fatal);
  const rankByFatal = sortedByFatal.findIndex((s) => s.slug === slug) + 1;

  return {
    thisFatalCount: self.stats.severity.fatal,
    thisTotalCount: self.stats.total,
    thisFatalRate: self.stats.total > 0 ? self.stats.severity.fatal / self.stats.total : 0,
    avgFatalRate,
    rankByFatal,
    totalIndustries: all.length,
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
  /** Phase A additions */
  timeBands: TimeBandCount[];
  workplaceSizes: SizeTierCount[];
  severityRatio: SeverityRatio;
  worstMonths: WorstMonth[];
  dangerFactors: DangerFactor[];
  comparison: IndustryComparison;
  /** Phase B addition — multi-year monthly series for the recharts panel */
  monthlyByYear: { rows: MonthlyByYear[]; years: number[] };
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
    timeBands: getTimeBandDistribution(slug),
    workplaceSizes: getWorkplaceSizeDistribution(slug),
    severityRatio: getSeverityRatio(slug),
    worstMonths: getWorstMonths(slug, 3),
    dangerFactors: getDangerFactors(slug, 5),
    comparison: getIndustryComparison(slug),
    monthlyByYear: getMonthlySeriesByYear(slug, 3),
  };
}
