import { describe, expect, it } from "vitest";
import type { LaborRssItem } from "@/lib/signage/parse-labor-rss";
import { selectHomeLatestAccidentReports } from "./latest-accident-news";

const NOW = new Date("2026-07-31T12:00:00+09:00").getTime();
const rss = (
  title: string,
  date: string,
  suffix: string,
): LaborRssItem => ({
  title,
  link: `https://news.google.com/rss/articles/${suffix}`,
  pubDate: new Date(date).toUTCString(),
});

describe("selectHomeLatestAccidentReports", () => {
  it("shows recent domestic reports in publication order with explicit unverified provenance", () => {
    const reports = selectHomeLatestAccidentReports(
      [
        rss(
          "工事現場で作業員が転落し死亡 愛知県 - 中日新聞Web",
          "2026-07-30T10:00:00+09:00",
          "a",
        ),
        rss(
          "倉庫でフォークリフトに挟まれ従業員が重傷 大阪府 - 共同通信",
          "2026-07-29T10:00:00+09:00",
          "b",
        ),
        rss(
          "補修工事の警備員がトラックにはねられ死亡 福島県 - 福島テレビ",
          "2026-07-28T10:00:00+09:00",
          "c",
        ),
      ],
      NOW,
      3,
    );

    expect(reports.map((report) => report.publisher)).toEqual([
      "中日新聞Web",
      "共同通信",
      "福島テレビ",
    ]);
    expect(reports.every((report) => report.verification === "reported-unverified")).toBe(true);
    expect(reports[0]?.industry).toContain("建設業");
    expect(reports[0]?.accidentType).toContain("墜落・転落");
    expect(reports[1]?.accidentType).toContain("はさまれ");
    expect(reports[2]?.accidentType).toContain("交通事故");
  });

  it("excludes stale, future, foreign, commentary, and non-incident items", () => {
    const reports = selectHomeLatestAccidentReports(
      [
        rss(
          "建設現場で作業員が死亡 コソボ - kossev.info",
          "2026-07-30T10:00:00+09:00",
          "foreign",
        ),
        rss(
          "死亡災害 リスクアセスメントの重点点検を - 労働新聞社",
          "2026-07-30T10:00:00+09:00",
          "commentary",
        ),
        rss(
          "工事現場で作業員が転落し死亡 - 地方紙",
          "2026-07-01T10:00:00+09:00",
          "stale",
        ),
        rss(
          "工場で従業員が重傷 - 地方紙",
          "2026-08-02T10:00:00+09:00",
          "future",
        ),
      ],
      NOW,
      4,
    );

    expect(reports).toEqual([]);
  });

  it("deduplicates reports that describe the same event", () => {
    const reports = selectHomeLatestAccidentReports(
      [
        rss(
          "川崎のクレーン解体事故で41歳作業員の遺体を発見 - 媒体A",
          "2026-07-30T12:00:00+09:00",
          "same-a",
        ),
        rss(
          "川崎クレーン解体事故、41歳の作業員遺体を発見 - 媒体B",
          "2026-07-30T11:00:00+09:00",
          "same-b",
        ),
      ],
      NOW,
      3,
    );

    expect(reports).toHaveLength(1);
  });
});
