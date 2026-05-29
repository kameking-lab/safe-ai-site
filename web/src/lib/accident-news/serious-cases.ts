/**
 * P0-1: 重大災害事例ブラウザ（accident-news-deep-audit 2026-05-29）
 *
 * データ源: 厚労省 死亡災害DB（`deaths-mhlw/compact.json`）。**全件匿名**（会社名・発注者・
 * 被災者氏名を含まない）。死亡＝重大災害として、業種/事故型/年で類型検索し、同種事故頻度を
 * 添える。会社名・発注者は扱わない（法的リスク回避、docs/accident-news-deep-audit-2026-05-26/04）。
 *
 * 出典は厚労省 職場のあんぜんサイト 死亡災害DB。全カードに出典を明示する。
 */
import deathsCompact from "@/data/deaths-mhlw/compact.json";

export type DeathRecord = {
  id: string;
  year: number;
  month: number | null;
  description: string;
  industry: string | null;
  industryMedium: string | null;
  cause: string | null;
  type: string | null;
  workplaceSize: string | null;
  occurrenceTime: string | null;
};

type Compact = {
  generatedAt: string;
  total: number;
  years?: number[];
  byYear?: Record<string, number>;
  byType?: Record<string, number>;
  byIndustry?: Record<string, number>;
  entries: DeathRecord[];
};

const compact = deathsCompact as unknown as Compact;

export const SERIOUS_CASES_META = {
  total: compact.total ?? compact.entries?.length ?? 0,
  generatedAt: compact.generatedAt ?? null,
  sourceLabel: "厚生労働省 職場のあんぜんサイト 死亡災害データベース",
  sourceUrl: "https://anzeninfo.mhlw.go.jp/",
} as const;

function countMap(records: readonly DeathRecord[], key: "type" | "industry"): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of records) {
    const v = r[key];
    if (v) m[v] = (m[v] ?? 0) + 1;
  }
  return m;
}

const TYPE_COUNTS = compact.byType ?? countMap(compact.entries ?? [], "type");
const INDUSTRY_COUNTS = compact.byIndustry ?? countMap(compact.entries ?? [], "industry");

export type FilterOption = { value: string; count: number };
export type SeriousCaseFilters = {
  industries: FilterOption[];
  types: FilterOption[];
  years: number[];
};

/** フィルタUI用の選択肢（件数降順、最大件数で抑制）。 */
export function getSeriousCaseFilters(maxEach = 30): SeriousCaseFilters {
  const toOptions = (m: Record<string, number>) =>
    Object.entries(m)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxEach);
  const years = Array.from(new Set((compact.entries ?? []).map((e) => e.year)))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);
  return {
    industries: toOptions(INDUSTRY_COUNTS),
    types: toOptions(TYPE_COUNTS),
    years,
  };
}

export type SeriousCase = DeathRecord & {
  /** 同一事故型の収録総数（背景＝同種事故頻度） */
  sameTypeTotal: number;
  /** 同一業種の収録総数 */
  sameIndustryTotal: number;
};

export type SeriousCaseQuery = {
  industry?: string;
  type?: string;
  year?: number;
  q?: string;
  limit?: number;
};

function matchesQuery(r: DeathRecord, q: string): boolean {
  const hay = `${r.description} ${r.industry ?? ""} ${r.industryMedium ?? ""} ${r.cause ?? ""} ${r.type ?? ""}`;
  return hay.includes(q);
}

/** 条件で重大災害事例を絞り込み、同種頻度を付与して新しい順に返す。 */
export function filterSeriousCases(query: SeriousCaseQuery = {}): SeriousCase[] {
  const { industry, type, year, q, limit = 120 } = query;
  const qTrim = (q ?? "").trim();
  const filtered = (compact.entries ?? []).filter((r) => {
    if (industry && r.industry !== industry) return false;
    if (type && r.type !== type) return false;
    if (year && r.year !== year) return false;
    if (qTrim && !matchesQuery(r, qTrim)) return false;
    return true;
  });
  filtered.sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0));
  return filtered.slice(0, limit).map((r) => ({
    ...r,
    sameTypeTotal: r.type ? (TYPE_COUNTS[r.type] ?? 0) : 0,
    sameIndustryTotal: r.industry ? (INDUSTRY_COUNTS[r.industry] ?? 0) : 0,
  }));
}
