/**
 * 物質データ（/api/chemical-ra/substances、静的配信）を端末で1回だけ取得してキャッシュする。
 */
import type { OfficialSubstanceData } from "./official";
import { buildSearchIndex, type SearchIndexEntry } from "./search";

export interface LoadedSubstanceData {
  data: OfficialSubstanceData;
  index: SearchIndexEntry[];
  byCas: Map<string, OfficialSubstanceData["substances"][number]>;
}

let pending: Promise<LoadedSubstanceData> | null = null;

export function loadSubstanceData(fetcher: typeof fetch = fetch): Promise<LoadedSubstanceData> {
  if (pending) return pending;
  pending = fetcher("/api/chemical-ra/substances")
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as OfficialSubstanceData;
      if (!Array.isArray(data?.substances)) throw new Error("invalid substance data");
      return {
        data,
        index: buildSearchIndex(data.substances),
        byCas: new Map(data.substances.map((r) => [r[0], r])),
      };
    })
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}
