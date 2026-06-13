export type MhlwDeathRecord = {
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
  entries: MhlwDeathRecord[];
};

// C-1（モバイル実速度の構造是正）: deaths-mhlw/compact.json は生 2.4MB / 転送 0.5MB あり、
// 静的 import すると /accidents・/laws のページバンドルに同梱されて LCP を直撃する。
// 実際に検索が走る時にだけ dynamic import で取得する（モジュール内で1回だけロード）。
let compactPromise: Promise<Compact> | null = null;

function loadCompact(): Promise<Compact> {
  if (!compactPromise) {
    compactPromise = import("@/data/deaths-mhlw/compact.json").then(
      (m) => ((m as { default?: unknown }).default ?? m) as Compact,
    );
  }
  return compactPromise;
}

/** MHLW 死亡災害DBの収録件数（データ取得後に確定する） */
export async function getMhlwDeathsTotal(): Promise<number> {
  return (await loadCompact()).total;
}

// 重み付け：本文 > 事故型 > 業種 > 中業種 > 原因
const WEIGHTS = {
  description: 1,
  type: 5,
  industry: 4,
  industryMedium: 3,
  cause: 2,
} as const;

/**
 * クエリを CJK / カタカナ / 英数字に分解。1 文字トークンは捨てる。
 */
export function tokenize(query: string): string[] {
  if (!query) return [];
  // 漢字 2-8 / カタカナ 2-8 / 英数 2-12 のいずれか
  const re = /[一-龥々]{2,8}|[ァ-ヴー]{2,10}|[A-Za-z0-9]{2,12}/g;
  const tokens = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(query)) !== null) {
    tokens.add(m[0]);
  }
  return [...tokens];
}

export type ScoredMhlwCase = MhlwDeathRecord & {
  score: number;
  matchedTokens: string[];
};

function scoreEntry(rec: MhlwDeathRecord, tokens: string[]): ScoredMhlwCase | null {
  let score = 0;
  const matched = new Set<string>();
  const desc = rec.description ?? "";
  const type = rec.type ?? "";
  const industry = rec.industry ?? "";
  const industryMedium = rec.industryMedium ?? "";
  const cause = rec.cause ?? "";
  for (const t of tokens) {
    let hit = false;
    if (desc.includes(t)) { score += WEIGHTS.description; hit = true; }
    if (type.includes(t)) { score += WEIGHTS.type; hit = true; }
    if (industry.includes(t)) { score += WEIGHTS.industry; hit = true; }
    if (industryMedium.includes(t)) { score += WEIGHTS.industryMedium; hit = true; }
    if (cause.includes(t)) { score += WEIGHTS.cause; hit = true; }
    if (hit) matched.add(t);
  }
  if (score === 0) return null;
  return { ...rec, score, matchedTokens: [...matched] };
}

/**
 * 簡易キーワード重み付けで MHLW 死亡災害 4,043 件から類似事例を検索する。
 * トークンが本文・事故型・業種・原因のどこに含まれるかでスコアリング。
 */
export async function searchMhlwSimilar(
  query: string,
  limit = 5
): Promise<ScoredMhlwCase[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const compact = await loadCompact();
  const scored: ScoredMhlwCase[] = [];
  for (const rec of compact.entries) {
    const s = scoreEntry(rec, tokens);
    if (s) scored.push(s);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** ProfileIndustry → 期待される MHLW industry 文字列の一覧 */
const PROFILE_INDUSTRY_TO_MHLW: Record<string, string[]> = {
  construction: ["建設業"],
  manufacturing: ["製造業"],
  healthcare: ["保健衛生業"],
  transport: ["陸上貨物運送事業", "運輸交通業"],
  it: ["通信業", "金融広告業"],
  forestry: ["林業"],
  logistics: ["陸上貨物運送事業"],
  other: [],
};

/**
 * 業種を厳密フィルタした上でキーワードスコア検索する。
 * フォールバック付き：業種厳密一致で 0 件なら全件対象にして "loose" を返す。
 */
export async function searchMhlwSimilarStrict(
  query: string,
  profileIndustry: string,
  limit = 5
): Promise<{ cases: ScoredMhlwCase[]; mode: "strict" | "loose" | "none" }> {
  const expectedIndustries = PROFILE_INDUSTRY_TO_MHLW[profileIndustry] ?? [];
  const tokens = tokenize(query);
  if (tokens.length === 0) return { cases: [], mode: "none" };

  const compact = await loadCompact();

  // 厳密モード: profile.industry に一致する MHLW industry のみ対象
  if (expectedIndustries.length > 0) {
    const strict: ScoredMhlwCase[] = [];
    for (const rec of compact.entries) {
      if (!rec.industry || !expectedIndustries.some((i) => rec.industry?.includes(i))) continue;
      const s = scoreEntry(rec, tokens);
      if (s) strict.push(s);
    }
    if (strict.length > 0) {
      strict.sort((a, b) => b.score - a.score);
      return { cases: strict.slice(0, limit), mode: "strict" };
    }
  }

  // フォールバック: 業種制限なしで全件対象
  const loose: ScoredMhlwCase[] = [];
  for (const rec of compact.entries) {
    const s = scoreEntry(rec, tokens);
    if (s) loose.push(s);
  }
  loose.sort((a, b) => b.score - a.score);
  if (loose.length === 0) return { cases: [], mode: "none" };
  return { cases: loose.slice(0, limit), mode: "loose" };
}
