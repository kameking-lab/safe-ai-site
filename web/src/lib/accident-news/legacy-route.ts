export const LEGACY_FATAL_ACCIDENT_QUERY_KEYS = [
  "industry",
  "type",
  "year",
  "q",
  "focus",
  "page",
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * /accident-news が死亡災害検索だった時代の絞り込みURLを、新しい正本へ
 * 引き継ぐ。既知の旧パラメータが1つでもある場合だけ移送し、UTM等も
 * 含めて受け取ったクエリを失わない。
 */
export function buildLegacyFatalAccidentsRedirect(
  searchParams: SearchParams,
): string | null {
  const hasLegacyQuery = LEGACY_FATAL_ACCIDENT_QUERY_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(searchParams, key),
  );
  if (!hasLegacyQuery) return null;

  const next = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) next.append(key, value);
    } else if (typeof rawValue === "string") {
      next.set(key, rawValue);
    }
  }
  const query = next.toString();
  return query ? `/fatal-accidents?${query}` : "/fatal-accidents";
}
