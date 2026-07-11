import byYearJson from "@/data/aggregates-mhlw/accidents-by-year.json";
import byTypeIndustryJson from "@/data/aggregates-mhlw/accidents-by-type-industry.json";
import summary2025 from "@/data/aggregates-mhlw/summary-2025-preliminary.json";
import deathsCompact from "@/data/deaths-mhlw/compact.json";
import { MEASURES_BY_TYPE } from "@/data/hazard-slides/measures-by-type";
import { findEntryByShort } from "@/lib/law-navi/permalink";
import { QUIZ_BY_TYPE } from "@/data/hazard-slides/quiz-by-type";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { loadCombinedCases, type CombinedCase } from "@/lib/accidents-analytics/loader";
import {
  ACCIDENT_TYPE_TO_HAZARD_SLUG,
  CANONICAL_HAZARD_TYPES,
  getHazardType,
  normalizeHazardType,
  type CanonicalHazardType,
  type HazardTypeSlug,
} from "@/lib/accidents/type-normalization";
import type { LearningQuestion } from "@/lib/types/operations";

/**
 * 災害の型別サマリ（教育スライドのデータ正本）。
 *
 * 仕組み: 新規のcron・中間JSONは作らない。「データJSONのコミット→ビルド時に
 * このモジュールが静的importから計算→全スライド静的再生成」という既存の追従
 * モデル（getAnalyticsAggregates と同型・プロセス内キャッシュ）に乗せる。
 * つまり etl-mhlw-monthly.yml 等の自動コミットが入るだけでスライドは自動更新される。
 *
 * すべての型キーは type-normalization.ts の正規化辞書を通してから集計する
 * （表記ゆれの二重計上をここでは構造的に起こせない）。
 */

export type NameCount = { name: string; count: number };

/**
 * 対策チェック項目（条文リンク解決済み）。
 * lawHref はビルド時に法令ナビのコーパスで解決する。クライアント（スライドUI）に
 * 法令コーパスを積まないため、辞書の lawRef はここで文字列に落として渡す。
 */
export type ResolvedMeasureItem = {
  text: string;
  /** 例: 安衛則第518条 */
  lawLabel?: string;
  /** 法令ナビ内部パス（コーパス未収載なら undefined＝リンク無し表示） */
  lawHref?: string;
};

export type ResolvedMeasures = { headline: string; checklist: ResolvedMeasureItem[] };

function resolveMeasures(slug: HazardTypeSlug): ResolvedMeasures {
  const m = MEASURES_BY_TYPE[slug];
  return {
    headline: m.headline,
    checklist: m.checklist.map((item) => {
      if (!item.lawRef) return { text: item.text };
      const entry = findEntryByShort(item.lawRef.lawShort, item.lawRef.articleNum);
      return {
        text: item.text,
        lawLabel: `${item.lawRef.lawShort}${item.lawRef.articleNum}`,
        lawHref: entry?.path,
      };
    }),
  };
}

export type FeaturedHazardCase = {
  id: string;
  title: string;
  summary: string;
  mainCauses: string[];
  preventionPoints: string[];
  /** 出典表示（政府標準利用規約2.0の出典明記） */
  sourceLabel: string;
  sourceUrl?: string;
  occurredOn?: string;
  severity?: string;
  origin: "curated" | "mhlw-deaths";
};

export type HazardTypeSummary = CanonicalHazardType & {
  kpi: {
    /** 死亡個票 2019〜2024 の合計 */
    deathsTotal: number;
    /** 死亡件数の21分類内の順位（1始まり。0件は null） */
    deathsRank: number | null;
    /** 休業4日以上 死傷者数（確定値の最新年） */
    injuriesLatestCount: number | null;
    injuriesLatestYear: number | null;
    /** 確定値の最初年→最新年の増減率（%・負=減少）。分母0は null */
    trendPercent: number | null;
    injuriesFirstYear: number | null;
  };
  /** 休業4日以上 死傷者数の年次推移（確定値。正規化済み） */
  yearTrend: { year: number; count: number }[];
  /** 死傷者数の多い業種 Top5（2006〜2021合算） */
  topIndustries: NameCount[];
  /** 死亡個票の起因物 Top5（2019〜2024） */
  topCauses: NameCount[];
  /** 死亡個票の発生時間帯分布（2019〜2024） */
  timeDistribution: NameCount[];
  /** 代表事例（最大2件。curated優先・不足時は死亡個票。出典必須） */
  featuredCases: FeaturedHazardCase[];
  measures: ResolvedMeasures;
  quiz: LearningQuestion[];
  /** 2025年速報の死亡者数（速報に型別集計がある型のみ） */
  preliminaryDeaths2025: number | null;
  dataAsOf: {
    /** 例: 確定値（死傷者数）: 2006〜2021年 */
    injuries: string;
    /** 例: 死亡個票: 2019〜2024年 */
    deaths: string;
    /** 速報の注記（型別値が無い型は null） */
    preliminary: string | null;
    sourceNote: string;
  };
};

type YearTypeMap = Record<string, Record<string, number>>;

/** 業種名の表記ゆれ（半角中黒・「保険」誤字等）の吸収と、業種でないゴミキーの除外。 */
const INDUSTRY_ALIASES: Record<string, string> = {
  "畜産･水産業": "畜産・水産業",
  "清掃･と畜業": "清掃・と畜業",
  教育研究業: "教育・研究業",
  "教育･研究業": "教育・研究業",
  "保健・衛生業": "保健衛生業",
  "保健･衛生業": "保健衛生業",
  "保険・衛生業": "保健衛生業",
  保健衛生: "保健衛生業",
  "映画･演劇業": "映画・演劇業",
  "金融･広告業": "金融・広告業",
  公務: "官公署",
};

/** 業種列に混入している非業種キー（Excel参照エラー・起因物分類の漏れ込み） */
const INDUSTRY_GARBAGE = new Set(["#REF!", "#NAME?", "仮設物、建築物、構築物等"]);

function normalizeIndustryLabel(raw: string): string | null {
  const key = raw.trim();
  if (!key || INDUSTRY_GARBAGE.has(key)) return null;
  return INDUSTRY_ALIASES[key] ?? key;
}

function topN(map: Map<string, number>, n: number): NameCount[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))
    .slice(0, n);
}

function buildYearTrends(): Map<HazardTypeSlug, { year: number; count: number }[]> {
  const byYear = byYearJson as YearTypeMap;
  const perSlug = new Map<HazardTypeSlug, Map<number, number>>();
  for (const [yearStr, types] of Object.entries(byYear)) {
    const year = Number(yearStr);
    if (!Number.isFinite(year)) continue;
    for (const [rawType, count] of Object.entries(types)) {
      const slug = normalizeHazardType(rawType);
      if (!slug) continue;
      let m = perSlug.get(slug);
      if (!m) {
        m = new Map();
        perSlug.set(slug, m);
      }
      m.set(year, (m.get(year) ?? 0) + count);
    }
  }
  const out = new Map<HazardTypeSlug, { year: number; count: number }[]>();
  for (const [slug, m] of perSlug) {
    out.set(
      slug,
      [...m.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year),
    );
  }
  return out;
}

function buildTopIndustries(): Map<HazardTypeSlug, NameCount[]> {
  const byTypeIndustry = byTypeIndustryJson as Record<string, Record<string, number>>;
  const perSlug = new Map<HazardTypeSlug, Map<string, number>>();
  for (const [rawType, industries] of Object.entries(byTypeIndustry)) {
    const slug = normalizeHazardType(rawType);
    if (!slug) continue;
    let m = perSlug.get(slug);
    if (!m) {
      m = new Map();
      perSlug.set(slug, m);
    }
    for (const [rawIndustry, count] of Object.entries(industries)) {
      const industry = normalizeIndustryLabel(rawIndustry);
      if (!industry) continue;
      m.set(industry, (m.get(industry) ?? 0) + count);
    }
  }
  const out = new Map<HazardTypeSlug, NameCount[]>();
  for (const [slug, m] of perSlug) out.set(slug, topN(m, 5));
  return out;
}

function isDeathRecord(c: CombinedCase): boolean {
  return c.source === "mhlw-deaths-compact" || c.source === "mhlw-deaths-2024";
}

function sortTimeBuckets(items: NameCount[]): NameCount[] {
  return [...items].sort((a, b) => {
    const na = Number(a.name.match(/^(\d+)/)?.[1] ?? 99);
    const nb = Number(b.name.match(/^(\d+)/)?.[1] ?? 99);
    return na - nb;
  });
}

/** 死亡個票 description の要約（スライド事例カード用。文の区切りで切る） */
function truncateDescription(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastPunct = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("、"));
  return `${cut.slice(0, lastPunct > max * 0.5 ? lastPunct + 1 : max)}…`;
}

type CompactEntry = {
  id: string;
  year: number;
  month: number | null;
  description: string;
  industry: string | null;
  type: string | null;
};

function buildFeaturedCases(slug: HazardTypeSlug, compactEntries: CompactEntry[]): FeaturedHazardCase[] {
  const out: FeaturedHazardCase[] = [];
  // 1) curated事例（provenance mhlw/curated のみ。synthetic/preliminaryは教材の事例枠に使わない）
  const curated = getAccidentCasesDataset()
    .filter((c) => {
      const p = c.provenance ?? "curated";
      return (p === "mhlw" || p === "curated") && ACCIDENT_TYPE_TO_HAZARD_SLUG[c.type] === slug;
    })
    // 重篤度→新しさの順（教材価値の高い順・決定的）
    .sort((a, b) => {
      const sev = (s: string) => (s === "死亡" ? 3 : s === "重傷" ? 2 : s === "中等傷" ? 1 : 0);
      return sev(b.severity) - sev(a.severity) || b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id);
    });
  for (const c of curated.slice(0, 2)) {
    out.push({
      id: c.id,
      title: c.title,
      summary: c.summary,
      mainCauses: c.mainCauses.slice(0, 3),
      preventionPoints: c.preventionPoints.slice(0, 3),
      sourceLabel: c.source?.site ? `出典: ${c.source.site}` : "収載事例（公的資料から要約）",
      sourceUrl: c.source?.url,
      occurredOn: c.occurredOn,
      severity: c.severity,
      origin: "curated",
    });
  }
  if (out.length >= 2) return out;
  // 2) フォールバック: 死亡個票のdescription（レア型対策。出典を必ず明示）
  const deaths = compactEntries
    .filter((e) => normalizeHazardType(e.type) === slug && e.description && e.description.length >= 30)
    .sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0) || a.id.localeCompare(b.id));
  for (const e of deaths) {
    if (out.length >= 2) break;
    out.push({
      id: e.id,
      title: `${e.industry ?? "業種不明"}での${getHazardType(slug).label}災害（${e.year}年）`,
      summary: truncateDescription(e.description),
      mainCauses: [],
      preventionPoints: [],
      sourceLabel: "出典: 厚生労働省 死亡災害データベース",
      sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx",
      occurredOn: e.month ? `${e.year}-${String(e.month).padStart(2, "0")}` : String(e.year),
      severity: "死亡",
      origin: "mhlw-deaths",
    });
  }
  return out;
}

let cached: HazardTypeSummary[] | null = null;

/** 全21型のサマリをビルド時に計算（プロセス内キャッシュ）。 */
export function getHazardTypeSummaries(): HazardTypeSummary[] {
  if (cached) return cached;

  const yearTrends = buildYearTrends();
  const topIndustries = buildTopIndustries();

  // 死亡個票（compact 2019-2023 + records-2024）: 型別に件数・起因物・時間帯
  const deathCases = loadCombinedCases().filter(isDeathRecord);
  const deathsBySlug = new Map<HazardTypeSlug, number>();
  const causesBySlug = new Map<HazardTypeSlug, Map<string, number>>();
  const timeBySlug = new Map<HazardTypeSlug, Map<string, number>>();
  let deathYearMin = Infinity;
  let deathYearMax = 0;
  for (const c of deathCases) {
    const slug = c.type ? normalizeHazardType(c.type) : null;
    if (!slug) continue;
    deathsBySlug.set(slug, (deathsBySlug.get(slug) ?? 0) + 1);
    if (c.year > 0) {
      deathYearMin = Math.min(deathYearMin, c.year);
      deathYearMax = Math.max(deathYearMax, c.year);
    }
    if (c.cause) {
      let m = causesBySlug.get(slug);
      if (!m) causesBySlug.set(slug, (m = new Map()));
      m.set(c.cause, (m.get(c.cause) ?? 0) + 1);
    }
    if (c.occurrenceTime) {
      let m = timeBySlug.get(slug);
      if (!m) timeBySlug.set(slug, (m = new Map()));
      m.set(c.occurrenceTime, (m.get(c.occurrenceTime) ?? 0) + 1);
    }
  }

  // 死亡件数順位
  const deathRanking = [...deathsBySlug.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);

  // 速報（2025）: 型別死亡（中黒表記キー→正規化）
  const prelimByType = new Map<HazardTypeSlug, number>();
  const prelim = summary2025 as unknown as {
    deaths_by_accident_type?: Record<string, number>;
    source?: { as_of?: string };
  };
  for (const [rawType, count] of Object.entries(prelim.deaths_by_accident_type ?? {})) {
    const slug = normalizeHazardType(rawType);
    if (slug) prelimByType.set(slug, count);
  }
  const prelimAsOf = prelim.source?.as_of ?? "";

  const compactEntries = (deathsCompact as unknown as { entries: CompactEntry[] }).entries;

  const summaries = CANONICAL_HAZARD_TYPES.map((t): HazardTypeSummary => {
    const trend = yearTrends.get(t.slug) ?? [];
    const first = trend.length ? trend[0] : null;
    const last = trend.length ? trend[trend.length - 1] : null;
    const trendPercent =
      first && last && first.count > 0
        ? Math.round(((last.count - first.count) / first.count) * 1000) / 10
        : null;
    const deathsTotal = deathsBySlug.get(t.slug) ?? 0;
    const rankIdx = deathRanking.indexOf(t.slug);
    const prelim2025 = prelimByType.get(t.slug) ?? null;
    return {
      ...t,
      kpi: {
        deathsTotal,
        deathsRank: deathsTotal > 0 && rankIdx >= 0 ? rankIdx + 1 : null,
        injuriesLatestCount: last?.count ?? null,
        injuriesLatestYear: last?.year ?? null,
        trendPercent,
        injuriesFirstYear: first?.year ?? null,
      },
      yearTrend: trend,
      topIndustries: topIndustries.get(t.slug) ?? [],
      topCauses: topN(causesBySlug.get(t.slug) ?? new Map(), 5),
      timeDistribution: sortTimeBuckets(topN(timeBySlug.get(t.slug) ?? new Map(), 12)),
      featuredCases: buildFeaturedCases(t.slug, compactEntries),
      measures: resolveMeasures(t.slug),
      quiz: QUIZ_BY_TYPE[t.slug],
      preliminaryDeaths2025: prelim2025,
      dataAsOf: {
        injuries: first && last ? `確定値（休業4日以上死傷者数）: ${first.year}〜${last.year}年` : "確定値: 収載なし",
        deaths:
          deathYearMax > 0 ? `死亡災害個票: ${deathYearMin}〜${deathYearMax}年` : "死亡災害個票: 収載なし",
        preliminary: prelim2025 !== null ? `2025年速報値（${prelimAsOf}）` : null,
        sourceNote: "出典: 厚生労働省 労働災害統計・死亡災害データベース（政府標準利用規約2.0）",
      },
    };
  });

  cached = summaries;
  return summaries;
}

export function getHazardTypeSummary(slug: string): HazardTypeSummary | undefined {
  return getHazardTypeSummaries().find((s) => s.slug === slug);
}
