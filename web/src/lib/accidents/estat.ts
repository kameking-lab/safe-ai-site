/**
 * e-Stat API レスポンス正規化（Phase B P3-1・純粋関数）。
 *
 * e-Stat getStatsList のレスポンスから、労働災害関連の公式統計表カタログを抽出・正規化する。
 * 数値の軸別解釈（getStatsData）は表ごとの構造差が大きく誤読＝創作リスクがあるため本Phaseでは行わず、
 * 「公式統計表のメタ情報＋e-Statリンク」を提供する（実データ・出典明示）。
 */

export interface EstatTable {
  id: string;
  statName: string;
  title: string;
  govOrg: string;
  surveyDate: string;
  updatedDate: string;
  /** e-Stat 上で表を見るためのURL（dataset画面）。 */
  url: string;
}

function pickStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "$" in (v as Record<string, unknown>)) {
    const inner = (v as { $?: unknown }).$;
    return typeof inner === "string" ? inner : "";
  }
  return v == null ? "" : String(v);
}

/** getStatsList JSON から統計表カタログを正規化（STATUS!=0 や空は []）。 */
export function parseEstatStatsList(raw: unknown): { ok: boolean; status: number; tables: EstatTable[] } {
  const root = (raw as { GET_STATS_LIST?: unknown })?.GET_STATS_LIST as Record<string, unknown> | undefined;
  if (!root) return { ok: false, status: -1, tables: [] };
  const result = (root.RESULT ?? {}) as { STATUS?: unknown };
  const status = typeof result.STATUS === "number" ? result.STATUS : Number(result.STATUS ?? -1);
  const dl = (root.DATALIST_INF ?? {}) as { TABLE_INF?: unknown };
  let infs: unknown[] = [];
  if (Array.isArray(dl.TABLE_INF)) infs = dl.TABLE_INF;
  else if (dl.TABLE_INF && typeof dl.TABLE_INF === "object") infs = [dl.TABLE_INF];

  const tables: EstatTable[] = infs.map((t) => {
    const o = t as Record<string, unknown>;
    const id = pickStr(o["@id"]);
    const statNameObj = o.STAT_NAME as Record<string, unknown> | undefined;
    const govObj = o.GOV_ORG as Record<string, unknown> | undefined;
    return {
      id,
      statName: pickStr(statNameObj),
      title: pickStr(o.TITLE) || pickStr(o.STATISTICS_NAME),
      govOrg: pickStr(govObj),
      surveyDate: pickStr(o.SURVEY_DATE),
      updatedDate: pickStr(o.UPDATED_DATE),
      url: id ? `https://www.e-stat.go.jp/dbview?sid=${id}` : "https://www.e-stat.go.jp/",
    };
  }).filter((t) => t.id);

  return { ok: status === 0, status, tables };
}
