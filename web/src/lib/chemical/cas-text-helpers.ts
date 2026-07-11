/**
 * CAS・物質名の正規化ヘルパー（依存ゼロの小モジュール）
 *
 * mhlw-chemicals.ts（巨大JSON同梱）と mhlw-chemicals-slim.ts の両方から使うため、
 * クライアントバンドルに全量データを引き込まないようここへ分離（2026-07-11）。
 */

/** CAS 番号の軽いノーマライズ（空白除去・全角→半角） */
export function normalizeCas(v: string): string {
  return v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u3000]/g, "")
    .trim();
}

/** CAS / 名称 / 備考を対象にしたノーマライズ */
export function normalizeText(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

/** CAS の柔軟マッチ: ハイフンを外した比較・前方一致・部分一致 */
export function casMatches(query: string, cas: string | null): boolean {
  if (!cas) return false;
  const q = normalizeCas(query);
  if (!q) return true;
  const nc = normalizeCas(cas);
  if (nc.includes(q)) return true;
  // ハイフン無しで比較
  return nc.replace(/-/g, "").includes(q.replace(/-/g, ""));
}
