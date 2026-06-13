/**
 * サイトマップ lastmod を「各データの実更新日」から導出するための純粋ヘルパー（柱C-3-4）。
 *
 * 方針（捏造0・SEO健全性）:
 *  - 現在時刻そのものを lastmod にしない（lastmod スパムを避ける）。
 *    常に「データに実在する日付の最大値」を採用する。
 *  - 将来日（将来施行の法改正の enforcement_date 等）は cap（通常はビルド日）で除外する。
 *    未来の lastmod は Google に無視され、サイト全体の lastmod 信頼度を毀損するため。
 *  - 有効な日付が無ければ著者指定の fallback を返す（静的ページの手書き日付を尊重）。
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD 形式の文字列か。 */
export function isIsoDate(d: unknown): d is string {
  return typeof d === "string" && ISO_DATE.test(d);
}

/**
 * dates のうち「有効な YYYY-MM-DD かつ cap 以下」のものの最大値を返す。
 * 一つも無ければ fallback。ISO 文字列は辞書順比較がそのまま日付の大小に一致する。
 *
 * @param dates    候補日付（null/空/不正値は無視）
 * @param fallback 有効な候補が無いときに返す既定値（手書きの著者日付など）
 * @param cap      これより未来の日付を除外する上限（通常はビルド日 YYYY-MM-DD）。省略時は無制限。
 */
export function latestIsoDate(
  dates: ReadonlyArray<string | null | undefined>,
  fallback: string,
  cap?: string,
): string {
  let best: string | null = null;
  for (const d of dates) {
    if (!isIsoDate(d)) continue;
    if (cap && d > cap) continue;
    if (best === null || d > best) best = d;
  }
  return best ?? fallback;
}
