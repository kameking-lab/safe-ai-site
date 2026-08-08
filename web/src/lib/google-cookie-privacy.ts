const GOOGLE_COOKIE_NAME = /^(?:_ga(?:_.+)?|_gid|_gat(?:_.+)?|_gcl_au|__gads|__gpi|__eoi)$/;
const PRODUCTION_ROOT = "anzen-ai-portal.jp";

export function isGoogleOptionalCookie(name: string): boolean {
  return GOOGLE_COOKIE_NAME.test(name);
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

/** Domain属性を付けて削除してよい、自サイト所有範囲だけを返す。 */
export function googleCookieDeletionDomains(hostname: string): string[] {
  const host = hostname.toLowerCase().replace(/^\.+|\.+$/g, "");
  if (!host || host === "localhost" || isIpAddress(host)) return [];
  if (host === PRODUCTION_ROOT || host.endsWith(`.${PRODUCTION_ROOT}`)) {
    return [...new Set([host, PRODUCTION_ROOT])];
  }
  if (host.endsWith(".vercel.app")) return [host];
  // localtest.me はブラウザー回帰テスト専用。production buildでは共有ルートへ触れない。
  if (process.env.NODE_ENV !== "production" && (host === "localtest.me" || host.endsWith(".localtest.me"))) {
    return [...new Set([host, "localtest.me"])];
  }
  return [];
}

export function removeGoogleOptionalCookies(doc: Document = document, location: Location = window.location): string[] {
  const names = new Set(
    doc.cookie
      .split(";")
      .map((entry) => entry.split("=")[0]?.trim())
      .filter((name): name is string => Boolean(name && isGoogleOptionalCookie(name))),
  );
  const secure = location.protocol === "https:" ? "; Secure" : "";
  const domains = googleCookieDeletionDomains(location.hostname);
  for (const name of names) {
    const base = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax${secure}`;
    doc.cookie = base;
    for (const domain of domains) {
      doc.cookie = `${base}; Domain=${domain}`;
      doc.cookie = `${base}; Domain=.${domain}`;
    }
  }
  return [...names];
}
