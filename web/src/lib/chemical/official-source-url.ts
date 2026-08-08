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
