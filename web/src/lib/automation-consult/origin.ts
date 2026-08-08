const SAFE_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

export function isValidAutomationConsultOrigin(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;

  let requestUrl: URL;
  let originUrl: URL;
  try {
    requestUrl = new URL(request.url);
    originUrl = new URL(originHeader);
  } catch {
    return false;
  }

  if (originUrl.origin !== requestUrl.origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !SAFE_FETCH_SITES.has(fetchSite.toLowerCase())) return false;

  return true;
}

export function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) return false;
  return contentType.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}
