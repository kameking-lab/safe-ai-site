/** fetchedAt(ISO文字列) の経過時間からデータ鮮度を判定する純関数 */

export function ageHours(fetchedAtIso: string, now: Date): number | null {
  const fetchedAt = new Date(fetchedAtIso).getTime();
  if (Number.isNaN(fetchedAt)) return null;
  return (now.getTime() - fetchedAt) / (60 * 60 * 1000);
}

export function isDataStale(fetchedAtIso: string, thresholdHours: number, now: Date): boolean {
  const age = ageHours(fetchedAtIso, now);
  // パース不能な日時は「鮮度不明」ではなく stale 扱い（監視を沈黙させない）
  if (age === null) return true;
  return age > thresholdHours;
}
