/** 公開画面へ出せる厚生労働省配下のHTTPS資料URLだけを返す。 */
export function verifiedMhlwPublicDocumentUrl(
  candidate: string | null | undefined,
): string | undefined {
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    const allowedHost =
      url.hostname === "mhlw.go.jp" ||
      url.hostname.endsWith(".mhlw.go.jp");
    return url.protocol === "https:" && allowedHost
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** CASが一致するNITE政府版GHSの参照先だけを公開する。原典の更新日は別途確認する。 */
export function verifiedNiteGhsDocumentUrl(candidate: string | null | undefined, cas: string): string | undefined {
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname === "www.chem-info.nite.go.jp" &&
      url.pathname === `/chem/ghs/m-nite-${cas}.html` && !url.username && !url.password
      ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
