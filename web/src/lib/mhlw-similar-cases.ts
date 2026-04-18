import deathsCompact from "@/data/deaths-mhlw/compact.json";

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

const compact = deathsCompact as unknown as Compact;

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

/**
 * 簡易キーワード重み付けで MHLW 死亡災害 4,043 件から類似事例を検索する。
 * トークンが本文・事故型・業種・原因のどこに含まれるかでスコアリング。
 */
export function searchMhlwSimilar(
  query: string,
  limit = 5
): ScoredMhlwCase[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored: ScoredMhlwCase[] = [];
  for (const rec of compact.entries) {
    let score = 0;
    const matched = new Set<string>();
    const desc = rec.description ?? "";
    const type = rec.type ?? "";
    const industry = rec.industry ?? "";
    const industryMedium = rec.industryMedium ?? "";
    const cause = rec.cause ?? "";

    for (const t of tokens) {
      let hit = false;
      if (desc.includes(t)) {
        score += WEIGHTS.description;
        hit = true;
      }
      if (type.includes(t)) {
        score += WEIGHTS.type;
        hit = true;
      }
      if (industry.includes(t)) {
        score += WEIGHTS.industry;
        hit = true;
      }
      if (industryMedium.includes(t)) {
        score += WEIGHTS.industryMedium;
        hit = true;
      }
      if (cause.includes(t)) {
        score += WEIGHTS.cause;
        hit = true;
      }
      if (hit) matched.add(t);
    }
    if (score > 0) {
      scored.push({ ...rec, score, matchedTokens: [...matched] });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export const MHLW_DEATHS_TOTAL = compact.total;
