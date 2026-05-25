/**
 * KY全面再設計 P0-A: 過去KY一覧の絞り込み・並べ替え（純関数・テスト可能）。
 * ローカル/クラウドのサマリーを source 付きで受け、現場名/期間/キーワードで絞り、並べ替える。
 */
import type { KyRecordSummary } from "@/lib/types/operations";

export type KyListSource = "local" | "cloud";
export type KyListEntry = KyRecordSummary & { source: KyListSource };
export type ListPeriod = "7d" | "30d" | "all";
export type ListSort = "newest" | "oldest" | "site";

export type ListFilter = {
  keyword?: string;
  period?: ListPeriod;
  sort?: ListSort;
  /** テスト用に現在時刻を注入可能 */
  now?: number;
};

const PERIOD_MS: Record<Exclude<ListPeriod, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function filterAndSortKyList(entries: KyListEntry[], filter: ListFilter = {}): KyListEntry[] {
  const { keyword = "", period = "all", sort = "newest", now = Date.now() } = filter;
  const kw = keyword.trim().toLowerCase();
  let out = entries.slice();

  if (period !== "all") {
    const cutoff = now - PERIOD_MS[period];
    out = out.filter((e) => {
      const t = Date.parse(e.savedAt);
      return Number.isNaN(t) ? true : t >= cutoff; // 日付不明は除外しない
    });
  }

  if (kw) {
    out = out.filter((e) =>
      [e.siteName, e.projectName, e.foremanName, e.companyName, e.workDetail, e.workDate]
        .join(" ")
        .toLowerCase()
        .includes(kw)
    );
  }

  out.sort((a, b) => {
    if (sort === "site") {
      const s = (a.siteName || "").localeCompare(b.siteName || "", "ja");
      if (s !== 0) return s;
      return (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0);
    }
    const ta = Date.parse(a.savedAt) || 0;
    const tb = Date.parse(b.savedAt) || 0;
    return sort === "oldest" ? ta - tb : tb - ta;
  });

  return out;
}
