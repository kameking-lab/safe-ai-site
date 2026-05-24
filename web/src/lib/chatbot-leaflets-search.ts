/**
 * Phase 4: AI 応答に対して関連する厚労省リーフレットをキーワード検索する。
 *
 * 既存の searchRelevantNotices (notice-search.ts) のリーフレット版。
 * シンプルなキーワード一致でスコアリング (最大 3 件)。
 */

import { mhlwLeaflets, type MhlwLeaflet } from "@/data/mhlw-leaflets";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　]/g, "")
    .replace(/[、,。．.「」『』（）()【】\[\]?？!！]/g, "");
}

/** リーフレットを検索 (タイトル・カテゴリ・サブカテゴリのキーワード一致でスコアリング) */
export function searchRelevantLeaflets(
  query: string,
  k = 3,
): MhlwLeaflet[] {
  const nq = normalize(query);
  if (!nq) return [];

  const scored: Array<{ leaflet: MhlwLeaflet; score: number }> = [];

  // クエリを 2 文字以上のトークンで分割 (簡易日本語トークナイズ)
  const tokens = new Set<string>();
  for (let i = 0; i < nq.length - 1; i++) {
    tokens.add(nq.slice(i, i + 2));
  }
  for (let i = 0; i < nq.length - 2; i++) {
    tokens.add(nq.slice(i, i + 3));
  }

  for (const l of mhlwLeaflets) {
    const haystack = normalize(
      [l.title, l.categoryLabel ?? "", l.publisher ?? ""].join(" "),
    );
    if (!haystack) continue;
    let score = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) score += t.length;
    }
    if (score > 0) scored.push({ leaflet: l, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.leaflet);
}
