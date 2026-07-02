/**
 * 条番号クエリパーサ（診断書 docs/fable-diagnosis-2026-07-02/05-search-egov.md の T2 / BACKLOG O8-b）。
 *
 * 横断検索(/search・⌘K)の生クエリに含まれる「法令名＋条番号」を、curated 条文
 * インデックスのタイトル/keywords（例: title「安衛法 第61条」・keyword「第61条」）へ
 * 合流できる正規形へ書き換える。cross-search の AND エンジン({@link ../cross-search})は
 * クエリを空白区切りの各語に分けて扱うため、地続きの「安衛法61条」を「安衛法 第61条」へ
 * 分解し、漢数字・全角数字・枝番（の／ハイフン）を吸収することで、e-Gov でも 0 件になる
 * 生クエリ（診断書 比較 a,b）を該当条文へ直撃させる。
 *
 * 変換対象は「条」を含む条番号表現のみ。第/条マーカーの無い裸の数字や日付範囲
 * "2024-2026" を誤って条番号へ変換しないため、いずれの形式も末尾の「条」を必須にしている。
 * 法令名部分（安衛法・安衛則…）や通常語（石綿 事前調査）はそのまま素通しする＝
 * 既存の 2 語 AND 検索（O8-a）を一切壊さない。
 *
 * 漢数字→算用数字は /law-search（law-search-panel.tsx）の kanjiToNum と同一ロジック。
 * 当該関数はコンポーネント内の非公開関数のため import できず、当班 lib へ再実装している。
 */

/** 漢数字 1 文字→値。十／百／千は位取り。 */
const KANJI_DIGIT: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 〇: 0,
  十: 10, 百: 100, 千: 1000,
};

/** 連続した漢数字（例「六十一」）を算用数字文字列（"61"）へ。変換不能はそのまま返す。 */
function kanjiRunToArabic(run: string): string {
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
function toArabic(token: string): string {
  // 全角数字→半角
  const half = token.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (/^[0-9]+$/.test(half)) return half;
  return kanjiRunToArabic(half);
}

/** 条番号に現れうる数字（半角/全角/漢数字）1 文字クラス。 */
const NUM = '[0-9０-９一二三四五六七八九〇十百千]';

/**
 * 条番号表現の抽出。いずれの分岐も末尾「条」必須（裸の数字・日付範囲の誤変換防止）。
 *   分岐1: 第?N条(の|-M)?   例「61条」「第61条」「第六十一条」「第61条の2」「第10条-3」
 *   分岐2: 第?N-M条         例「61-2条」「61－2条」（枝番をハイフンで先出し）
 */
const ARTICLE_RE = new RegExp(
  `第?\\s*(${NUM}+)\\s*条(?:\\s*(?:の|[-－])\\s*(${NUM}+))?` +
    `|第?\\s*([0-9０-９]+)\\s*[-－]\\s*([0-9０-９]+)\\s*条`,
  'g',
);

/**
 * 生クエリ中の条番号表現を「第N条」「第N条のM」の正規形へ書き換える。
 * 書き換えたトークンは前後を空白で区切り、法令名部分と別語（AND）として扱わせる。
 * 条番号表現が無ければ（空白正規化を除き）実質そのまま返す。
 *
 * 例: 「安衛法61条」→「安衛法 第61条」／「第六十一条」→「第61条」／
 *     「安衛則563条」→「安衛則 第563条」／「61-2条」→「第61条の2」
 */
export function normalizeArticleQuery(query: string): string {
  if (!query) return query;
  const rewritten = query.replace(ARTICLE_RE, (full, n1, b1, n2, b2) => {
    const numToken = (n1 ?? n2) as string | undefined;
    if (!numToken) return full;
    const num = toArabic(numToken);
    if (!/^[0-9]+$/.test(num) || num === '0') return full; // 変換不能はそのまま
    const branchToken = (b1 ?? b2) as string | undefined;
    const branch = branchToken ? toArabic(branchToken) : '';
    const canon = branch && /^[0-9]+$/.test(branch) ? `第${num}条の${branch}` : `第${num}条`;
    return ` ${canon} `;
  });
  return rewritten.replace(/\s+/g, ' ').trim();
}
