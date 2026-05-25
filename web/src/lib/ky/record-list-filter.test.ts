import { describe, expect, it } from "vitest";
import { filterAndSortKyList, type KyListEntry } from "@/lib/ky/record-list-filter";

const NOW = Date.parse("2026-05-25T09:00:00Z");
const day = 24 * 60 * 60 * 1000;

function entry(p: Partial<KyListEntry>): KyListEntry {
  return {
    id: p.id ?? "1",
    workDate: p.workDate ?? "2026-05-25",
    companyName: p.companyName ?? "",
    siteName: p.siteName ?? "",
    projectName: p.projectName ?? "",
    foremanName: p.foremanName ?? "",
    workDetail: p.workDetail ?? "",
    weather: p.weather ?? "",
    savedAt: p.savedAt ?? "2026-05-25T08:00:00Z",
    source: p.source ?? "local",
  };
}

const ENTRIES: KyListEntry[] = [
  entry({ id: "a", siteName: "A現場", savedAt: new Date(NOW - 1 * day).toISOString(), workDetail: "鉄骨建方" }),
  entry({ id: "b", siteName: "B現場", savedAt: new Date(NOW - 10 * day).toISOString(), workDetail: "外壁塗装" }),
  entry({ id: "c", siteName: "C現場", savedAt: new Date(NOW - 40 * day).toISOString(), workDetail: "解体" }),
];

describe("filterAndSortKyList", () => {
  it("period=7d は直近7日のみ", () => {
    const r = filterAndSortKyList(ENTRIES, { period: "7d", now: NOW });
    expect(r.map((e) => e.id)).toEqual(["a"]);
  });

  it("period=30d は直近30日のみ", () => {
    const r = filterAndSortKyList(ENTRIES, { period: "30d", now: NOW });
    expect(r.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("period=all は全件", () => {
    expect(filterAndSortKyList(ENTRIES, { period: "all", now: NOW })).toHaveLength(3);
  });

  it("keyword は現場名/作業内容にマッチ", () => {
    expect(filterAndSortKyList(ENTRIES, { keyword: "塗装", now: NOW }).map((e) => e.id)).toEqual(["b"]);
    expect(filterAndSortKyList(ENTRIES, { keyword: "A現場", now: NOW }).map((e) => e.id)).toEqual(["a"]);
  });

  it("sort=newest は新しい順（既定）", () => {
    expect(filterAndSortKyList(ENTRIES, { now: NOW }).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("sort=oldest は古い順", () => {
    expect(filterAndSortKyList(ENTRIES, { sort: "oldest", now: NOW }).map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  it("sort=site は現場名順", () => {
    const r = filterAndSortKyList(ENTRIES, { sort: "site", now: NOW });
    expect(r.map((e) => e.siteName)).toEqual(["A現場", "B現場", "C現場"]);
  });

  it("元配列を破壊しない", () => {
    const before = ENTRIES.map((e) => e.id);
    filterAndSortKyList(ENTRIES, { sort: "oldest", now: NOW });
    expect(ENTRIES.map((e) => e.id)).toEqual(before);
  });
});
