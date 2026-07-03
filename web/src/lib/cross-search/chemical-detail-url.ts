import casKeys from './chemical-detail-cas.json';

/**
 * 化学物質の横断検索ヒットを、canonical な個別詳細ページ /chemical-database/[cas] へ
 * 深リンクするための純関数（柱C-2）。
 *
 * 詳細ページ src/app/(main)/chemical-database/[cas]/page.tsx は
 * `CONCENTRATION_LIMITS.substances[normalizeCas(cas)]` が無い CAS を notFound() で弾くため、
 * 濃度基準DB（concentration-limits.json）のキー集合＝「実在の詳細ページに解決する CAS の全体」。
 * そのキー集合を軽量スナップショット（chemical-detail-cas.json ≒ 40KB、gz ≒ 13KB）として持ち、
 * 濃度基準DB 本体（約 2.0MB）を client の検索チャンクへ載せずに membership 判定する。
 *
 * - CAS が集合に在る → canonical 詳細ページへ（sitemap-chemicals.xml 収載 URL と 1:1 一致）
 * - CAS が集合に無い（未収載 ≒ 4%）→ 従来の一覧クエリページ /chemical-database?q= へフォールバック
 *   ＝幽霊URL 0（存在しない詳細ページへは決してリンクしない）。
 *
 * スナップショットの再生成: `node scripts/gen-chemical-detail-cas.mjs`
 * ドリフト検出: chemical-detail-cas.test.ts が濃度基準DBキー集合との一致を CI で検証する。
 */
const DETAIL_CAS = new Set<string>(casKeys as string[]);

/** mhlw-chemicals.ts の normalizeCas と厳密に同一（濃度基準DB本体を import せず自己完結させる）。 */
function normalizeCas(v: string): string {
  return v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]/g, '')
    .trim();
}

/** 個別詳細ページを持つ CAS か（＝深リンク可能か）。 */
export function hasChemicalDetailPage(cas: string): boolean {
  return DETAIL_CAS.has(normalizeCas(cas));
}

/**
 * 化学物質ヒットの遷移先 URL を返す。詳細ページが実在する CAS は canonical 詳細へ、
 * それ以外は一覧クエリページへフォールバックする（幽霊URL 0）。
 */
export function chemicalDetailUrl(cas: string, fallbackName: string): string {
  const normalized = normalizeCas(cas);
  if (DETAIL_CAS.has(normalized)) {
    return `/chemical-database/${normalized}`;
  }
  return `/chemical-database?q=${encodeURIComponent(fallbackName)}`;
}
