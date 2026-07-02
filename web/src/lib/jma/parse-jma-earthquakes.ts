/** 気象庁 bosai quake/data/list.json から震度3以上の直近地震を抽出 */

import type { JmaEarthquake } from "./jma-data";

type JmaRawQuake = {
  eid?: string;
  rdt?: string;
  at?: string;
  anm?: string;
  mag?: string;
  maxInt?: string;
  ttl?: string;
};

const SEVERE_ENOUGH = new Set(["3", "4", "5-", "5+", "6-", "6+", "7"]);

export function parseEarthquakeList(raw: unknown, limit = 30): JmaEarthquake[] {
  const list = Array.isArray(raw) ? (raw as JmaRawQuake[]) : [];
  return list
    .filter((q) => Boolean(q?.maxInt) && SEVERE_ENOUGH.has(String(q.maxInt)))
    .slice(0, limit)
    .map((q) => ({
      eventId: q.eid ?? null,
      reportDatetime: q.rdt ?? null,
      occurredAt: q.at ?? null,
      hypocenter: q.anm ?? null,
      magnitude: q.mag ?? null,
      maxIntensity: q.maxInt ?? null,
      title: q.ttl ?? null,
    }));
}
