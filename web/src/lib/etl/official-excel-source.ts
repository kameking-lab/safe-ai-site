const MHLW_EXCEL_HOST = "anzeninfo.mhlw.go.jp";
const MHLW_INFORMATION_PREFIX = "/information/";
const BUNSEKI_FILENAME = /^r\d+_\d+_(?:sibou|sisyou)_bunseki\.xlsx$/i;

/**
 * 厚労省速報ページに掲載された分析用Excelだけを許可する。
 * ページ本文に外部URLが混入しても、ETLがそのURLを取得しないためのサーバー側allowlist。
 */
export function resolveOfficialMhlwExcelUrl(rawHref: string): string | null {
  try {
    const normalizedHref = /^\.?\/?information\//i.test(rawHref)
      ? rawHref.replace(/^\.?\/?information\//i, "")
      : rawHref;
    const url = new URL(
      normalizedHref,
      "https://anzeninfo.mhlw.go.jp/information/",
    );
    const filename = url.pathname.split("/").at(-1) ?? "";
    if (url.protocol !== "https:") return null;
    if (url.hostname !== MHLW_EXCEL_HOST) return null;
    if (!url.pathname.startsWith(MHLW_INFORMATION_PREFIX)) return null;
    if (!BUNSEKI_FILENAME.test(filename)) return null;
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}
