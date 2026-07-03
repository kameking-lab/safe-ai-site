import { describe, it, expect } from "vitest";
import { signageLocations, getSignageLocationById, getSignageLocationByRegionName } from "./signage-locations";

describe("signageLocations（S4: 47都道府県化）", () => {
  it("47都道府県すべてが最低1地点持つ", () => {
    const isos = new Set(signageLocations.map((l) => l.prefectureIso));
    expect(isos.size).toBe(47);
    for (let n = 1; n <= 47; n++) {
      const iso = `JP-${String(n).padStart(2, "0")}`;
      expect(isos.has(iso), `missing ${iso}`).toBe(true);
    }
  });

  it("id が全件ユニーク", () => {
    const ids = signageLocations.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("全地点の緯度経度が日本の範囲内", () => {
    for (const l of signageLocations) {
      expect(l.latitude, l.id).toBeGreaterThan(20);
      expect(l.latitude, l.id).toBeLessThan(46);
      expect(l.longitude, l.id).toBeGreaterThan(122);
      expect(l.longitude, l.id).toBeLessThan(154);
    }
  });

  it("getSignageLocationById が新規追加県（例: 沖縄）を解決できる", () => {
    const okinawa = getSignageLocationById("okinawa-naha");
    expect(okinawa?.prefectureIso).toBe("JP-47");
    expect(okinawa?.regionName).toBe("沖縄県 那覇市");
  });

  it("getSignageLocationByRegionName が新規追加県を解決できる", () => {
    expect(getSignageLocationByRegionName("岩手県 盛岡市")?.prefectureIso).toBe("JP-03");
  });
});
