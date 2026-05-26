/**
 * 事故AI注意喚起の「関連事故抽出」純粋関数（Phase B P0-1）。
 *
 * 業種カテゴリ・作業内容から、既存事故事例DBの中で関連性の高いケースをスコアリング抽出する。
 * AIに渡す根拠（実データ）を選ぶための決定論的ロジック。創作は一切せず、既存ケースのみ返す。
 */
import type { AccidentCase, AccidentWorkCategory } from "@/lib/types/domain";

export interface RelevantQuery {
  workContent?: string;
  category?: AccidentWorkCategory | "";
}

export interface RelevantHit {
  case: AccidentCase;
  score: number;
}

/** 作業内容テキストを2文字以上のトークンに分割（日本語の素朴な区切り）。 */
export function tokenize(text: string): string[] {
  return (text || "")
    .split(/[\s、。,.\/・（）()「」\[\]【】]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * 関連事故を抽出（スコア降順、上位 limit 件）。
 * スコア = 作業内容トークンが title/summary/mainCauses に含まれる数（各1点）＋
 *          業種カテゴリ一致（+2点）。スコア0は除外（category一致のみは含める）。
 */
export function findRelevantAccidents(
  query: RelevantQuery,
  cases: readonly AccidentCase[],
  limit = 5
): RelevantHit[] {
  const tokens = tokenize(query.workContent ?? "");
  const cat = query.category && query.category.length > 0 ? query.category : null;

  const hits: RelevantHit[] = [];
  for (const c of cases) {
    const haystack = `${c.title}\n${c.summary}\n${(c.mainCauses ?? []).join("\n")}`;
    let score = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) score += 1;
    }
    if (cat && c.workCategory === cat) score += 2;
    if (score > 0) hits.push({ case: c, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
