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

/**
 * 事故型ごとの「一般的な対策の考え方（参考）」。
 * 特定事故の経緯を推測するものではなく、その事故型に対する確立された一般原則を示す
 * （KY危険予知・チャットボットP1-5と同型）。具体の適用は公式・専門家確認を促す。
 */
const GENERAL_MEASURES_BY_TYPE: Record<string, string> = {
  墜落: "手すり・親綱・フルハーネスの確実な使用、開口部・端部の養生、昇降設備の点検。",
  転落: "手すり・親綱・フルハーネスの確実な使用、開口部・端部の養生、昇降設備の点検。",
  "墜落、転落": "手すり・親綱・フルハーネスの確実な使用、開口部・端部の養生、昇降設備の点検。",
  はさまれ: "稼働部の起動防止（ロックアウト/タグアウト）、立入禁止区画、可動範囲への進入防止。",
  巻き込まれ: "稼働部の起動防止（ロックアウト/タグアウト）、立入禁止区画、可動範囲への進入防止。",
  "はさまれ、巻き込まれ": "稼働部の起動防止（ロックアウト/タグアウト）、立入禁止区画、可動範囲への進入防止。",
  飛来: "立入禁止区画・防網・上下作業の分離、保護具（保護帽等）の着用。",
  落下: "立入禁止区画・防網・上下作業の分離、保護具（保護帽等）の着用。",
  "飛来、落下": "立入禁止区画・防網・上下作業の分離、保護具（保護帽等）の着用。",
  崩壊: "土留め・支保工の設置と点検、地山・法面の安定確認、立入禁止。",
  倒壊: "土留め・支保工の設置と点検、地山・法面の安定確認、立入禁止。",
  "崩壊、倒壊": "土留め・支保工の設置と点検、地山・法面の安定確認、立入禁止。",
  激突: "車両・重機の運行経路と作業区域の分離、誘導者の配置、後方確認。",
  "激突され": "車両・重機の運行経路と作業区域の分離、誘導者の配置、後方確認。",
  感電: "停電・検電・接地、絶縁用保護具、活線作業の回避と離隔確保。",
  爆発: "可燃性ガス・粉じんの管理、着火源の排除、換気・濃度測定。",
  火災: "可燃性物の管理、火気使用時の養生・消火準備、避難経路の確保。",
  交通事故: "運行管理・速度遵守、適切な休憩、車両点検。",
  "高温・低温の物との接触": "断熱・遮へい、保護具、温度管理と表示。",
  "有害物等との接触": "代替・密閉・局所排気、保護具、ばく露低減（リスクアセスメント対象物は安衛則第577条の2）。",
  おぼれ: "立入禁止・防護柵、ライフジャケット、救助体制の確保。",
  動作の反動: "無理な姿勢・重量物取扱いの見直し、補助具の使用、教育。",
  "動作の反動、無理な動作": "無理な姿勢・重量物取扱いの見直し、補助具の使用、教育。",
};

/** 事故型に対する一般的対策の考え方（参考）。該当が無ければ汎用文。 */
export function getGeneralMeasures(type: string | null): string {
  if (type && GENERAL_MEASURES_BY_TYPE[type]) return GENERAL_MEASURES_BY_TYPE[type];
  return "作業のリスクアセスメントを実施し、該当作業の手順・保護具・教育を見直してください。";
}

/** ID で1件取得（同種頻度付与）。 */
export function getSeriousCaseById(id: string): SeriousCase | null {
  const r = (compact.entries ?? []).find((e) => e.id === id);
  if (!r) return null;
  return {
    ...r,
    sameTypeTotal: r.type ? (TYPE_COUNTS[r.type] ?? 0) : 0,
    sameIndustryTotal: r.industry ? (INDUSTRY_COUNTS[r.industry] ?? 0) : 0,
  };
}

/**
 * P2-2: 類似事例サジェスト。事故型(+3)・業種(+2)・原因一致(+2)・本文トークン重なり(+1/語)で
 * スコアし、seed を除く上位を返す。会社名等は扱わない（匿名）。
 */
export function findSimilarSeriousCases(
  seed: Pick<DeathRecord, "id" | "type" | "industry" | "cause" | "description">,
  limit = 6,
): SeriousCase[] {
  const seedTokens = new Set(
    (seed.description ?? "").match(/[一-龥々]{2,6}|[ァ-ヴー]{2,8}/g) ?? [],
  );
  const scored: { r: DeathRecord; s: number }[] = [];
  for (const r of compact.entries ?? []) {
    if (r.id === seed.id) continue;
    let s = 0;
    if (seed.type && r.type === seed.type) s += 3;
    if (seed.industry && r.industry === seed.industry) s += 2;
    if (seed.cause && r.cause && r.cause === seed.cause) s += 2;
    if (s === 0) continue; // 型・業種・原因のいずれも一致しないものは除外
    let overlap = 0;
    const toks = (r.description ?? "").match(/[一-龥々]{2,6}|[ァ-ヴー]{2,8}/g) ?? [];
    for (const t of toks) if (seedTokens.has(t)) overlap += 1;
    s += Math.min(overlap, 4);
    scored.push({ r, s });
  }
  scored.sort((a, b) => b.s - a.s || b.r.year - a.r.year);
  return scored.slice(0, limit).map(({ r }) => ({
    ...r,
    sameTypeTotal: r.type ? (TYPE_COUNTS[r.type] ?? 0) : 0,
    sameIndustryTotal: r.industry ? (INDUSTRY_COUNTS[r.industry] ?? 0) : 0,
  }));
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
