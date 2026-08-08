export function compactAccidentSummary(summary: string, maxLength = 72): string {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) return "概要を確認できません。";
  const firstSentence = normalized.match(/^.*?[。！？]/)?.[0] ?? normalized;
  return firstSentence.length <= maxLength
    ? firstSentence
    : `${firstSentence.slice(0, Math.max(1, maxLength - 1))}…`;
}
