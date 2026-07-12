/**
 * 気象警報 → `SiteNotification` の変換（通知センターのベル・サイネージ・閉端末Push
 * で共通の「何を警報として通知するか」の判定を1箇所に集約）。
 *
 * `/api/notify/feed`（表示中ポーリング）と `/api/notify/push-weather-alert`
 * （cronからの閉端末Push）が同じ判定・同じ安定ID・同じ本文を使うための正本。
 * ID を共有することで、ベルの既読管理（端末内）と Push の tag が一致し二重表示を抑止する。
 */
import { PREFECTURE_CENTROIDS } from "@/data/jma/prefecture-centroids";
import type { JmaWarningsFile } from "@/lib/jma/jma-data";
import type { SiteNotification } from "@/lib/notifications/feed-types";

const PREF_NAME = new Map(PREFECTURE_CENTROIDS.map((p) => [p.iso, p.name]));

/**
 * 指定都道府県の気象警報を SiteNotification 配列にする（注意報以上＝level !== "none"）。
 * 閉端末Push側は severity が warning/special のものだけを送る（警報級のみ）。
 */
export function buildWeatherNotifications(
  prefectureIso: string,
  warnings: JmaWarningsFile
): SiteNotification[] {
  const entry = warnings.byIso?.[prefectureIso];
  if (!entry?.entries?.length) return [];
  const prefName = PREF_NAME.get(prefectureIso) ?? prefectureIso;
  const items: SiteNotification[] = [];
  for (const w of entry.entries) {
    if (w.level === "none") continue;
    const levelLabel = w.level === "special" ? "特別警報" : w.level === "warning" ? "警報" : "注意報";
    items.push({
      id: `jma-${prefectureIso}-${w.sourceCode}-${w.reportDatetime ?? "latest"}`,
      category: "weather",
      title: `${prefName}: ${levelLabel} 発表中`,
      body: w.headline ?? undefined,
      date: w.reportDatetime ?? warnings.fetchedAt,
      url: "https://www.jma.go.jp/bosai/warning/",
      // CR2-H2: 汎用サイネージではなく警報・地震を地図で見る該当地域ビューへ。
      internalHref: "/signage/map",
      severity: w.level,
    });
  }
  return items;
}

/** 「警報級のみ」（閉端末Push・メール一斉・OS通知が対象にする severity）。 */
export function isAlertLevel(n: SiteNotification): boolean {
  return n.severity === "warning" || n.severity === "special";
}
