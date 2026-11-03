export const LAW_OPTIONS = [
  ["all", "すべての法令"],
  ["労働安全衛生法", "労働安全衛生法"],
  ["労働安全衛生法施行令", "労働安全衛生法施行令"],
  ["労働安全衛生規則", "労働安全衛生規則"],
  ["クレーン等安全規則", "クレーン等安全規則"],
  ["ボイラー及び圧力容器安全規則", "ボイラー及び圧力容器安全規則"],
  ["有機溶剤中毒予防規則", "有機溶剤中毒予防規則"],
  ["特定化学物質障害予防規則", "特定化学物質障害予防規則"],
  ["酸素欠乏症等防止規則", "酸素欠乏症等防止規則"],
  ["粉じん障害防止規則", "粉じん障害防止規則"],
  ["鉛中毒予防規則", "鉛中毒予防規則"],
  ["電離放射線障害防止規則", "電離放射線障害防止規則"],
  ["石綿障害予防規則", "石綿障害予防規則"],
] as const;
const LAW_VALUES = new Set(LAW_OPTIONS.map(([value]) => value));
const ARTICLE_NUMBER_PATTERN = /^(?:第)?\d{1,4}条(?:の\d{1,3}){0,2}$/u;
function firstValue(
  value: string | string[] | undefined,
  maxLength: number,
): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.slice(0, maxLength) : "";
}

export function safeLawParam(
  value: string | string[] | undefined,
): string {
  const law = firstValue(value, 40);
  return LAW_VALUES.has(law as (typeof LAW_OPTIONS)[number][0]) ? law : "all";
}

export function safeArticleParam(
  value: string | string[] | undefined,
): string {
  const article = firstValue(value, 24)
    .normalize("NFKC")
    .replace(/\s+/gu, "");
  if (/^\d{1,4}$/u.test(article)) return `第${article}条`;
  if (!ARTICLE_NUMBER_PATTERN.test(article)) return "";
  return article.startsWith("第") ? article : `第${article}`;
}
