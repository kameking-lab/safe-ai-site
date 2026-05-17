/**
 * Cross-industry comparison data layer for /accidents-reports/compare.
 *
 * Composes per-industry slices produced by `accident-analysis.ts` into a
 * side-by-side comparison DTO. Adds derived metrics that only make sense
 * across multiple industries — per-metric leaders, share-of-comparison
 * baselines, and quotable differential narrative strings.
 *
 * Server-only: imported from the compare route's server components.
 */

import {
  INDUSTRY_CONFIGS,
  getIndustryConfig,
  getIndustryReport,
  type DangerFactor,
  type IndustryConfig,
  type IndustryReport,
  type IndustrySlug,
  type MonthCount,
  type NameCount,
  type SeverityRatio,
  type SizeTierCount,
  type TimeBandCount,
  type YearCount,
} from "@/lib/accident-analysis";

export const MIN_COMPARE_INDUSTRIES = 2;
export const MAX_COMPARE_INDUSTRIES = 5;
export const DEFAULT_COMPARE_INDUSTRIES: readonly IndustrySlug[] = [
  "construction",
  "manufacturing",
  "transport",
  "healthcare",
  "service",
];

const VALID_SLUGS = new Set<IndustrySlug>(
  INDUSTRY_CONFIGS.map((c) => c.slug),
);

/**
 * Parse the `industries` URL search-param into a clean ordered slug list.
 * Rules:
 *  - Accepts a comma-separated string ("construction,manufacturing").
 *  - Unknown slugs are dropped silently (so old URLs don't 404 after a
 *    taxonomy change).
 *  - Duplicates are de-duped while preserving the first occurrence order.
 *  - Clamps to [MIN, MAX]; when fewer than MIN remain, falls back to
 *    DEFAULT_COMPARE_INDUSTRIES so the page always renders something
 *    useful (consultants land here without parameters).
 */
export function parseIndustryParam(
  raw: string | string[] | undefined,
): IndustrySlug[] {
  const flat = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const seen = new Set<IndustrySlug>();
  const out: IndustrySlug[] = [];
  for (const part of flat.split(",")) {
    const slug = part.trim() as IndustrySlug;
    if (!slug) continue;
    if (!VALID_SLUGS.has(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_COMPARE_INDUSTRIES) break;
  }
  if (out.length < MIN_COMPARE_INDUSTRIES) {
    return [...DEFAULT_COMPARE_INDUSTRIES];
  }
  return out;
}

/** Stable string used in canonical URLs and OG image cache keys. */
export function canonicalIndustryKey(slugs: readonly IndustrySlug[]): string {
  return [...slugs].sort().join(",");
}

/**
 * Composite row for one industry in the comparison view. Holds the full
 * IndustryReport (so existing per-industry aggregates can be reused) plus
 * a couple of comparison-tagged shortcuts used by the view layer.
 */
export type ComparisonRow = {
  slug: IndustrySlug;
  config: IndustryConfig;
  report: IndustryReport;
  fatalRate: number;
  lostWorkdayRate: number;
};

/* ------------------------------------------------------------------ */
/* Metric leadership                                                   */
/* ------------------------------------------------------------------ */

export type LeaderKey =
  | "total"
  | "fatal"
  | "fatalRate"
  | "lostWorkday"
  | "lostWorkdayRate"
  | "yoyGrowth";

export type Leader = {
  slug: IndustrySlug;
  label: string;
  value: number;
  formatted: string;
};

export type LeaderboardEntry = {
  key: LeaderKey;
  metricLabel: string;
  best: Leader | null;
  worst: Leader | null;
  /** Spread = worst - best (or relative ratio); used for the narrative line. */
  spread: number;
  /** Tone used by the UI when the "worst" value is the dangerous one. */
  worstIsDanger: boolean;
};

function fmtCount(n: number): string {
  return `${n.toLocaleString("ja-JP")}件`;
}

function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtPercentDelta(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

function pickExtreme(
  rows: ComparisonRow[],
  valueOf: (r: ComparisonRow) => number | null,
  direction: "max" | "min",
): Leader | null {
  let chosen: { row: ComparisonRow; value: number } | null = null;
  for (const r of rows) {
    const v = valueOf(r);
    if (v == null) continue;
    if (!chosen) {
      chosen = { row: r, value: v };
      continue;
    }
    if (direction === "max" ? v > chosen.value : v < chosen.value) {
      chosen = { row: r, value: v };
    }
  }
  return chosen
    ? {
        slug: chosen.row.slug,
        label: chosen.row.config.label,
        value: chosen.value,
        formatted: "",
      }
    : null;
}

/**
 * Build the leaderboard across the supplied rows. For each metric:
 *  - "best" = direction-aware (lowest fatal rate is best; highest total is
 *    not "best" — it's just the leader, and we treat it as the worst).
 *  - "worst" = the other end of the spectrum, also direction-aware.
 *
 * Output drives the differential-highlight callout and the "○○業は△△業
 * より××倍" narrative strings on the page.
 */
export function buildLeaderboard(rows: ComparisonRow[]): LeaderboardEntry[] {
  const total = pickExtreme(rows, (r) => r.report.stats.total, "max");
  const totalMin = pickExtreme(rows, (r) => r.report.stats.total, "min");
  const fatal = pickExtreme(rows, (r) => r.report.stats.severity.fatal, "max");
  const fatalMin = pickExtreme(rows, (r) => r.report.stats.severity.fatal, "min");
  const fatalRateMax = pickExtreme(rows, (r) => r.fatalRate, "max");
  const fatalRateMin = pickExtreme(rows, (r) => r.fatalRate, "min");
  const lostWorkdayMax = pickExtreme(
    rows,
    (r) => r.report.severityRatio.lostWorkday,
    "max",
  );
  const lostWorkdayMin = pickExtreme(
    rows,
    (r) => r.report.severityRatio.lostWorkday,
    "min",
  );
  const lostWorkdayRateMax = pickExtreme(rows, (r) => r.lostWorkdayRate, "max");
  const lostWorkdayRateMin = pickExtreme(rows, (r) => r.lostWorkdayRate, "min");
  const yoyMax = pickExtreme(rows, (r) => r.report.yoy?.deltaPct ?? null, "max");
  const yoyMin = pickExtreme(rows, (r) => r.report.yoy?.deltaPct ?? null, "min");

  const fmt = (l: Leader | null, fn: (v: number) => string): Leader | null =>
    l ? { ...l, formatted: fn(l.value) } : null;

  return [
    {
      key: "total",
      metricLabel: "総事故件数",
      best: fmt(totalMin, fmtCount),
      worst: fmt(total, fmtCount),
      spread: (total?.value ?? 0) - (totalMin?.value ?? 0),
      worstIsDanger: true,
    },
    {
      key: "fatal",
      metricLabel: "死亡災害件数",
      best: fmt(fatalMin, fmtCount),
      worst: fmt(fatal, fmtCount),
      spread: (fatal?.value ?? 0) - (fatalMin?.value ?? 0),
      worstIsDanger: true,
    },
    {
      key: "fatalRate",
      metricLabel: "死亡率(死亡÷総事故)",
      best: fmt(fatalRateMin, (v) => fmtPct(v)),
      worst: fmt(fatalRateMax, (v) => fmtPct(v)),
      spread: (fatalRateMax?.value ?? 0) - (fatalRateMin?.value ?? 0),
      worstIsDanger: true,
    },
    {
      key: "lostWorkday",
      metricLabel: "休業4日以上事案数",
      best: fmt(lostWorkdayMin, fmtCount),
      worst: fmt(lostWorkdayMax, fmtCount),
      spread: (lostWorkdayMax?.value ?? 0) - (lostWorkdayMin?.value ?? 0),
      worstIsDanger: true,
    },
    {
      key: "lostWorkdayRate",
      metricLabel: "休業比率(休業÷総事故)",
      best: fmt(lostWorkdayRateMin, (v) => fmtPct(v)),
      worst: fmt(lostWorkdayRateMax, (v) => fmtPct(v)),
      spread:
        (lostWorkdayRateMax?.value ?? 0) - (lostWorkdayRateMin?.value ?? 0),
      worstIsDanger: true,
    },
    {
      key: "yoyGrowth",
      metricLabel: "前年比増減率",
      best: fmt(yoyMin, fmtPercentDelta),
      worst: fmt(yoyMax, fmtPercentDelta),
      spread: (yoyMax?.value ?? 0) - (yoyMin?.value ?? 0),
      worstIsDanger: true,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Differential highlights — quotable comparative strings              */
/* ------------------------------------------------------------------ */

export type DifferentialHighlight = {
  id: string;
  /** Short label shown as a chip on the page. */
  tag: string;
  /** Human-readable sentence used in the callout box and OG description. */
  sentence: string;
  /** Tailwind tone for the callout: rose=危険, amber=注意, emerald=好転. */
  tone: "rose" | "amber" | "emerald" | "slate";
};

function ratioVerbal(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  const r = numerator / denominator;
  if (!Number.isFinite(r)) return "—";
  if (r >= 2) return `${r.toFixed(1)}倍`;
  return `${((r - 1) * 100).toFixed(0)}%多い`;
}

/**
 * Build narrative highlights. We aim for 3-5 punchy sentences a consultant
 * can drop into a slide deck:
 *  1. "Industry X has Yx more fatal accidents than Industry Z."
 *  2. "Industry X's fatal rate is N percentage points higher."
 *  3. "Industry X is the only one growing YoY (+N%)."
 *  4. "Industry X's top accident type differs from the rest."
 *  5. "Industry X's worst month is N; others peak in M."
 */
export function buildDifferentialHighlights(
  rows: ComparisonRow[],
): DifferentialHighlight[] {
  const out: DifferentialHighlight[] = [];
  if (rows.length < 2) return out;

  // (1) Fatal count gap
  const sortedFatal = [...rows].sort(
    (a, b) => b.report.stats.severity.fatal - a.report.stats.severity.fatal,
  );
  const fatalHi = sortedFatal[0];
  const fatalLo = sortedFatal[sortedFatal.length - 1];
  if (
    fatalHi.report.stats.severity.fatal > 0 &&
    fatalLo.report.stats.severity.fatal > 0 &&
    fatalHi.slug !== fatalLo.slug
  ) {
    const ratio = ratioVerbal(
      fatalHi.report.stats.severity.fatal,
      fatalLo.report.stats.severity.fatal,
    );
    out.push({
      id: "fatal-gap",
      tag: "死亡災害ギャップ",
      sentence: `${fatalHi.config.label}の死亡災害件数は${fatalLo.config.label}より${ratio}（${fatalHi.report.stats.severity.fatal.toLocaleString("ja-JP")}件 vs ${fatalLo.report.stats.severity.fatal.toLocaleString("ja-JP")}件）。`,
      tone: "rose",
    });
  }

  // (2) Fatal rate divergence
  const sortedRate = [...rows]
    .filter((r) => r.report.stats.total > 0)
    .sort((a, b) => b.fatalRate - a.fatalRate);
  if (sortedRate.length >= 2) {
    const hi = sortedRate[0];
    const lo = sortedRate[sortedRate.length - 1];
    const diffPts = (hi.fatalRate - lo.fatalRate) * 100;
    if (diffPts >= 0.5 && hi.slug !== lo.slug) {
      out.push({
        id: "fatal-rate",
        tag: "死亡率の差",
        sentence: `${hi.config.label}の死亡率(${fmtPct(hi.fatalRate)})は${lo.config.label}(${fmtPct(lo.fatalRate)})を${diffPts.toFixed(1)}pt上回り、致死性が際立っています。`,
        tone: "rose",
      });
    }
  }

  // (3) YoY growth outlier
  const yoyRows = rows.filter((r) => r.report.yoy);
  if (yoyRows.length >= 2) {
    const top = [...yoyRows].sort(
      (a, b) => (b.report.yoy!.deltaPct) - (a.report.yoy!.deltaPct),
    )[0];
    if (top.report.yoy && top.report.yoy.deltaPct >= 0.05) {
      out.push({
        id: "yoy-up",
        tag: "前年比増加",
        sentence: `${top.config.label}は前年比${fmtPercentDelta(top.report.yoy.deltaPct)}と直近で増加傾向。${top.report.yoy.previousYear}年→${top.report.yoy.latestYear}年で${top.report.yoy.latestCount.toLocaleString("ja-JP")}件まで上昇しました。`,
        tone: "amber",
      });
    }
    const bottom = [...yoyRows].sort(
      (a, b) => (a.report.yoy!.deltaPct) - (b.report.yoy!.deltaPct),
    )[0];
    if (bottom.report.yoy && bottom.report.yoy.deltaPct <= -0.05) {
      out.push({
        id: "yoy-down",
        tag: "前年比減少",
        sentence: `${bottom.config.label}は前年比${fmtPercentDelta(bottom.report.yoy.deltaPct)}と減少傾向。施策の効果検証ポイントになり得ます。`,
        tone: "emerald",
      });
    }
  }

  // (4) Divergent top accident type
  const topTypeMap = new Map<string, ComparisonRow[]>();
  for (const r of rows) {
    const t = r.report.topTypes[0]?.name;
    if (!t) continue;
    const arr = topTypeMap.get(t) ?? [];
    arr.push(r);
    topTypeMap.set(t, arr);
  }
  // Find a row whose top type is unique among the comparison set
  for (const r of rows) {
    const t = r.report.topTypes[0]?.name;
    if (!t) continue;
    const peers = topTypeMap.get(t) ?? [];
    if (peers.length === 1 && rows.length >= 3) {
      out.push({
        id: "topType-divergent",
        tag: "最多事故型の差",
        sentence: `${r.config.label}の最多事故型は「${t}」で、比較中の他業種とは異なる固有の事故傾向を示します。`,
        tone: "slate",
      });
      break;
    }
  }

  // (5) Worst-month divergence
  const worstMonths = rows.map((r) => ({
    slug: r.slug,
    label: r.config.label,
    month: r.report.worstMonths[0]?.month ?? null,
    tag: r.report.worstMonths[0]?.seasonTag ?? null,
  }));
  const monthCounts = new Map<number, number>();
  for (const w of worstMonths) {
    if (w.month == null) continue;
    monthCounts.set(w.month, (monthCounts.get(w.month) ?? 0) + 1);
  }
  const odd = worstMonths.find(
    (w) => w.month != null && (monthCounts.get(w.month!) ?? 0) === 1,
  );
  if (odd && odd.month != null && rows.length >= 3) {
    out.push({
      id: "worst-month",
      tag: "ピーク月の差",
      sentence: `${odd.label}は${odd.month}月(${odd.tag ?? "繁忙期"})に事故が集中。他業種と季節パターンが異なり、教育タイミング設計に差異が必要です。`,
      tone: "amber",
    });
  }

  return out.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Matrix builders for the side-by-side panels                         */
/* ------------------------------------------------------------------ */

/**
 * Top-N accident type ranking per industry, packaged as a matrix for the
 * comparison table. Top N defaults to 5 to keep the table readable.
 */
export type AccidentTypeMatrix = {
  rank: number;
  /** key = industry slug, value = (name + count) or null when no data at this rank */
  cells: Record<IndustrySlug, NameCount | null>;
}[];

export function buildAccidentTypeMatrix(
  rows: ComparisonRow[],
  topN = 5,
): AccidentTypeMatrix {
  const out: AccidentTypeMatrix = [];
  for (let i = 0; i < topN; i += 1) {
    const cells = {} as Record<IndustrySlug, NameCount | null>;
    for (const r of rows) cells[r.slug] = r.report.topTypes[i] ?? null;
    out.push({ rank: i + 1, cells });
  }
  return out;
}

export function buildCauseMatrix(
  rows: ComparisonRow[],
  topN = 5,
): AccidentTypeMatrix {
  const out: AccidentTypeMatrix = [];
  for (let i = 0; i < topN; i += 1) {
    const cells = {} as Record<IndustrySlug, NameCount | null>;
    for (const r of rows) cells[r.slug] = r.report.topCauses[i] ?? null;
    out.push({ rank: i + 1, cells });
  }
  return out;
}

export type DangerFactorMatrix = {
  rank: number;
  cells: Record<IndustrySlug, DangerFactor | null>;
}[];

export function buildDangerFactorMatrix(
  rows: ComparisonRow[],
  topN = 5,
): DangerFactorMatrix {
  const out: DangerFactorMatrix = [];
  for (let i = 0; i < topN; i += 1) {
    const cells = {} as Record<IndustrySlug, DangerFactor | null>;
    for (const r of rows) cells[r.slug] = r.report.dangerFactors[i] ?? null;
    out.push({ rank: i + 1, cells });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Monthly overlay series for the recharts panel                       */
/* ------------------------------------------------------------------ */

export type ComparisonMonthlyPoint = {
  month: number;
  monthLabel: string;
  /** key = industry slug, value = month count for that industry */
  [slug: string]: string | number;
};

export function buildMonthlyOverlay(rows: ComparisonRow[]): {
  points: ComparisonMonthlyPoint[];
  slugs: IndustrySlug[];
} {
  const slugs = rows.map((r) => r.slug);
  const points: ComparisonMonthlyPoint[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const point: ComparisonMonthlyPoint = { month: m, monthLabel: `${m}月` };
    for (const r of rows) {
      const entry = r.report.seasonality.find((s) => s.month === m);
      point[r.slug] = entry?.count ?? 0;
    }
    points.push(point);
  }
  return { points, slugs };
}

/* ------------------------------------------------------------------ */
/* Composite DTO                                                       */
/* ------------------------------------------------------------------ */

export type ComparisonDataset = {
  rows: ComparisonRow[];
  leaderboard: LeaderboardEntry[];
  highlights: DifferentialHighlight[];
  accidentTypeMatrix: AccidentTypeMatrix;
  causeMatrix: AccidentTypeMatrix;
  dangerFactorMatrix: DangerFactorMatrix;
  monthlyOverlay: { points: ComparisonMonthlyPoint[]; slugs: IndustrySlug[] };
  yearRange: { min: number; max: number };
  totalCases: number;
};

function safeRow(slug: IndustrySlug): ComparisonRow | null {
  const config = getIndustryConfig(slug);
  if (!config) return null;
  const report = getIndustryReport(slug);
  if (!report) return null;
  const total = report.stats.total;
  return {
    slug,
    config,
    report,
    fatalRate: total > 0 ? report.stats.severity.fatal / total : 0,
    lostWorkdayRate:
      total > 0 ? report.severityRatio.lostWorkday / total : 0,
  };
}

export function buildComparisonDataset(
  slugs: readonly IndustrySlug[],
): ComparisonDataset {
  const rows: ComparisonRow[] = [];
  for (const s of slugs) {
    const r = safeRow(s);
    if (r) rows.push(r);
  }
  const yearMins: number[] = [];
  const yearMaxes: number[] = [];
  let totalCases = 0;
  for (const r of rows) {
    if (r.report.stats.yearRange.min > 0)
      yearMins.push(r.report.stats.yearRange.min);
    if (r.report.stats.yearRange.max > 0)
      yearMaxes.push(r.report.stats.yearRange.max);
    totalCases += r.report.stats.total;
  }
  return {
    rows,
    leaderboard: buildLeaderboard(rows),
    highlights: buildDifferentialHighlights(rows),
    accidentTypeMatrix: buildAccidentTypeMatrix(rows, 5),
    causeMatrix: buildCauseMatrix(rows, 5),
    dangerFactorMatrix: buildDangerFactorMatrix(rows, 5),
    monthlyOverlay: buildMonthlyOverlay(rows),
    yearRange: {
      min: yearMins.length > 0 ? Math.min(...yearMins) : 0,
      max: yearMaxes.length > 0 ? Math.max(...yearMaxes) : 0,
    },
    totalCases,
  };
}

/* ------------------------------------------------------------------ */
/* Re-exports needed by the view layer                                 */
/* ------------------------------------------------------------------ */

export type {
  IndustryConfig,
  IndustryReport,
  IndustrySlug,
  MonthCount,
  NameCount,
  SeverityRatio,
  SizeTierCount,
  TimeBandCount,
  YearCount,
  DangerFactor,
};
