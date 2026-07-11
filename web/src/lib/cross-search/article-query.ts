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
 * 当該関数はコンポーネント内の非公開関数のため import できず、当班 lib の
 * {@link ../law-links/kanji-numerals} へ切り出して共有している（O18 のリンカーも同じ変換を使う）。
 */
import { NUM_CLASS, toArabic } from '../law-links/kanji-numerals';

/** 条番号に現れうる数字（半角/全角/漢数字）1 文字クラス。 */
const NUM = `[${NUM_CLASS}]`;

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
 * 別表番号表現の抽出（法令ナビ 別表意味インデックス。docs/horei-navi-foundation-2026-07-11 §2-4）。
 * 「別表第」マーカー必須＝裸の数字・「第3章」等を誤変換しない。枝番は「の」区切り
 * （例「別表第六の二」「別表第6の2」）。条番号と同じく漢数字・全角数字を吸収する。
 */
const BEPPYO_RE = new RegExp(`別表第\\s*(${NUM}+)(?:\\s*の\\s*(${NUM}+))?`, 'g');

/**
 * 生クエリ中の条番号表現を「第N条」「第N条のM」の正規形へ書き換える。
 * 書き換えたトークンは前後を空白で区切り、法令名部分と別語（AND）として扱わせる。
 * 条番号表現が無ければ（空白正規化を除き）実質そのまま返す。
 *
 * 例: 「安衛法61条」→「安衛法 第61条」／「第六十一条」→「第61条」／
 *     「安衛則563条」→「安衛則 第563条」／「61-2条」→「第61条の2」
 *
 * あわせて別表番号のゆらぎも正規形へ寄せる（診断 2026-07-11: 「別表第三」と「別表第3」で
 * 結果が割れていた）: 「別表第三」→「別表第3」／「別表第六の二」→「別表第6の2」。
 * 別表は前段で処理する（条の正規表現が「別表第六の二」の「六」を条番号と誤認しないよう、
 * 先に別表全体を消費して正規形トークンへ置き換える）。
 */
export function normalizeArticleQuery(query: string): string {
  if (!query) return query;
  const rewritten = query
    .replace(BEPPYO_RE, (full, nRaw, bRaw) => {
      const num = toArabic(nRaw as string);
      if (!/^[0-9]+$/.test(num) || num === '0') return full; // 変換不能はそのまま
      const branch = bRaw ? toArabic(bRaw as string) : '';
      return branch && /^[0-9]+$/.test(branch) ? ` 別表第${num}の${branch} ` : ` 別表第${num} `;
    })
    .replace(ARTICLE_RE, (full, n1, b1, n2, b2) => {
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
