/** データ時刻の人間化（「◯分前」）と鮮度しきい値判定の純関数群 */

export function formatRelativeTimeJa(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "時刻不明";

  const diffMs = nowMs - t;
  if (diffMs < 0) return "たった今";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0 ? `${hours}時間${remMinutes}分前` : `${hours}時間前`;
  }

  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

/** データ時刻が指定時間（既定2h）を超えて古いか。パース不能な時刻は「不明」ではなく古い扱い（監視を沈黙させない） */
export function isDataTimeStale(iso: string, nowMs: number, thresholdHours = 2): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return true;
  return (nowMs - t) / (60 * 60 * 1000) > thresholdHours;
}
