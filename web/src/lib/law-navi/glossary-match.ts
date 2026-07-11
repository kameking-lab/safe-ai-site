/**
 * 条文本文に登場する専門用語を用語集（@/data/glossary EXTRA_TERMS 152語）から抽出する。
 *
 * 法令ナビ条文ページの「この条文の用語」欄用（docs/horei-navi-foundation-2026-07-11 §2-6）。
 * 原文テキスト自体には手を入れない（原文不可侵）＝本文中へのリンク埋め込みではなく、
 * 出現用語の一覧を原文の下に併記する方式。
 */
import { EXTRA_TERMS } from "@/data/glossary";
import type { GlossaryTerm } from "@/data/glossary/types";

/** 出現位置つきのマッチ結果。 */
export type MatchedGlossaryTerm = {
  readonly term: GlossaryTerm;
  /** 条文本文中の初出位置（表示順の安定ソート用） */
  readonly index: number;
};

/**
 * 条文本文に出現する用語集語を初出順に返す。
 * - 2文字以上の語のみ（1文字語は誤マッチ源）。
 * - 他の採用語の部分文字列になる語は、より長い語が同位置で採れている場合は除外
 *   （「特定化学物質」があるとき「化学物質」を重複表示しない）。
 * - 既定 8 語まで（モバイルで用語欄が本文を圧迫しないための上限）。
 */
export function matchGlossaryTerms(text: string, limit = 8): MatchedGlossaryTerm[] {
  if (!text) return [];
  const hits: MatchedGlossaryTerm[] = [];
  for (const term of EXTRA_TERMS) {
    const name = term.term?.trim();
    if (!name || name.length < 2) continue;
    const index = text.indexOf(name);
    if (index === -1) continue;
    hits.push({ term, index });
  }
  // 長い語優先で重複領域を間引く（同一初出領域で「特定化学物質」>「化学物質」）。
  hits.sort((a, b) => b.term.term.length - a.term.term.length);
  const kept: MatchedGlossaryTerm[] = [];
  for (const h of hits) {
    const shadowed = kept.some(
      (k) =>
        k.term.term.includes(h.term.term) &&
        h.index >= k.index &&
        h.index < k.index + k.term.term.length
    );
    if (!shadowed) kept.push(h);
  }
  kept.sort((a, b) => a.index - b.index);
  return kept.slice(0, limit);
}
