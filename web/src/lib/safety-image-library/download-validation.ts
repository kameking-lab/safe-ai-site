const DOWNLOAD_QUERY_KEYS = new Set([
  "brand",
  "format",
  "lang",
  "mode",
  "orientation",
  "paper",
  "size",
]);
const UNIT = /^[\p{L}\p{N}%‰²³㎡㎥°℃/・.\- ]{0,16}$/u;

export function isShortPlainText(value: unknown, maxLength: number, maxLines: number): value is string {
  if (typeof value !== "string" || value.length > maxLength) return false;
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");
  return lines.length <= maxLines && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

export function isSafeSafetyImageUnit(value: unknown): value is string {
  return typeof value === "string" && UNIT.test(value) && isShortPlainText(value, 16, 1);
}

export function isSafeSafetyImageMainText(value: unknown): value is string {
  return isShortPlainText(value, 180, 12);
}

export function hasOnlyCanonicalQuery(search: URLSearchParams): boolean {
  for (const key of search.keys()) {
    if (!DOWNLOAD_QUERY_KEYS.has(key) || search.getAll(key).length !== 1) return false;
  }
  const hasLegacyPaper = search.has("paper");
  const hasLegacyOrientation = search.has("orientation");
  if (search.has("size") && (hasLegacyPaper || hasLegacyOrientation)) return false;
  if (hasLegacyPaper !== hasLegacyOrientation) return false;
  if (hasLegacyPaper) {
    if (!new Set(["A4", "A3"]).has(search.get("paper") ?? "")) return false;
    if (!new Set(["portrait", "landscape"]).has(search.get("orientation") ?? "")) return false;
  }
  const brand = search.get("brand");
  return brand === null || brand === "branded" || brand === "none";
}
