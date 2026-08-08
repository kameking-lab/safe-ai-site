export function compactLawRevisionSummary(summary: string): string {
  return summary
    .replace(/（出典:\s*e-Gov法令検索の構造データ）/g, "")
    .replace(/公布\s*\d{4}-\d{2}-\d{2}、施行日\s*\d{4}-\d{2}-\d{2}。?/g, "")
    .replace(/改正内容の詳細はe-Govの原文で必ずご確認ください。?/g, "")
    .replace(/。{2,}/g, "。")
    .trim();
}
