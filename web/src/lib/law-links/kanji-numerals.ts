/**
 * 漢数字・全角数字→算用数字の共通変換（条番号の正規化に使う）。
 *
 * もともと /law-search（law-search-panel.tsx）の非公開 `kanjiToNum` と同一ロジックを
 * O8-b の {@link ../cross-search/article-query} が再実装していたが、O18 の条文参照
 * リンカー（{@link ./article-ref-linkify}）も同じ変換を要するため、当班 lib 内の
 * 単一ソースへ切り出した。挙動は従来の article-query 実装と完全一致（回帰は
 * article-query.test.ts が固定）。
 */

/** 漢数字 1 文字→値。十／百／千は位取り。 */
const KANJI_DIGIT: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 〇: 0,
  十: 10, 百: 100, 千: 1000,
};

/** 条番号に現れうる数字（半角/全角/漢数字）1 文字クラス（角括弧なしの中身）。 */
export const NUM_CLASS = '0-9０-９一二三四五六七八九〇十百千';

/** 連続した漢数字（例「六十一」）を算用数字文字列（"61"）へ。変換不能はそのまま返す。 */
export function kanjiRunToArabic(run: string): string {
  let result = 0;
  let current = 0;
  for (const ch of run) {
    const val = KANJI_DIGIT[ch] ?? 0;
    if (val >= 10) {
      result += (current || 1) * val;
      current = 0;
    } else {
      current = val;
    }
  }
  result += current;
  return result > 0 ? String(result) : run;
}

/** 数字トークン（半角/全角/漢数字混在可）を算用数字文字列へ正規化。 */
export function toArabic(token: string): string {
  // 全角数字→半角
  const half = token.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (/^[0-9]+$/.test(half)) return half;
  return kanjiRunToArabic(half);
}
