import { describe, it, expect } from "vitest";
import { parseEarthquakeList } from "./parse-jma-earthquakes";

describe("parseEarthquakeList", () => {
  it("震度3未満は除外し、3以上のみ抽出する", () => {
    const raw = [
      { eid: "1", maxInt: "2", rdt: "a", at: "a", anm: "沖合", mag: "3.0", ttl: "地震情報" },
      { eid: "2", maxInt: "3", rdt: "b", at: "b", anm: "東京湾", mag: "4.5", ttl: "地震情報" },
      { eid: "3", maxInt: "5-", rdt: "c", at: "c", anm: "千葉県", mag: "5.0", ttl: "地震情報" },
    ];
    const items = parseEarthquakeList(raw);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.eventId)).toEqual(["2", "3"]);
  });

  it("maxInt 欠落は除外する", () => {
    expect(parseEarthquakeList([{ eid: "1" }])).toEqual([]);
  });

  it("limit 件数で切り詰める", () => {
    const raw = Array.from({ length: 40 }, (_, i) => ({ eid: String(i), maxInt: "4" }));
    expect(parseEarthquakeList(raw, 30)).toHaveLength(30);
  });

  it("配列以外・空配列は空配列を返す", () => {
    expect(parseEarthquakeList(null)).toEqual([]);
    expect(parseEarthquakeList(undefined)).toEqual([]);
    expect(parseEarthquakeList([])).toEqual([]);
  });

  it("フィールドを JmaEarthquake 形へマッピングする", () => {
    const items = parseEarthquakeList([
      { eid: "e1", rdt: "2026-07-02T10:00:00+09:00", at: "2026-07-02T09:58:00+09:00", anm: "茨城県沖", mag: "4.2", maxInt: "4", ttl: "震源・震度情報" },
    ]);
    expect(items[0]).toEqual({
      eventId: "e1",
      reportDatetime: "2026-07-02T10:00:00+09:00",
      occurredAt: "2026-07-02T09:58:00+09:00",
      hypocenter: "茨城県沖",
      magnitude: "4.2",
      maxIntensity: "4",
      title: "震源・震度情報",
    });
  });
});
