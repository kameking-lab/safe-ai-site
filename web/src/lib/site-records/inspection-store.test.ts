import { describe, it, expect } from "vitest";
import {
  itemsForKind,
  summarizeInspection,
  inspectionToCsv,
  KIND_ITEMS,
  EQUIP_KIND_JA,
  type InspectionRecord,
} from "./inspection-store";

describe("itemsForKind", () => {
  it("機種別の標準項目を返し初期は対象外", () => {
    const items = itemsForKind("forklift");
    expect(items.length).toBe(KIND_ITEMS.forklift.length);
    expect(items.every((i) => i.result === "na")).toBe(true);
    expect(items[0]!.label).toContain("制動");
  });
  it("各機種に点検項目が定義されている", () => {
    (Object.keys(KIND_ITEMS) as (keyof typeof KIND_ITEMS)[]).forEach((k) => {
      expect(KIND_ITEMS[k].length).toBeGreaterThanOrEqual(5);
    });
  });
});

function make(): InspectionRecord {
  const items = itemsForKind("mobile-crane");
  items[0]!.result = "ok";
  items[2]!.result = "ng";
  return {
    id: "i1",
    date: "2026-07-10",
    site: "現場A",
    inspector: "甲",
    equipKind: "mobile-crane",
    equipName: "25tラフター #3",
    items,
    usable: false,
    abnormalAction: "ワイヤ交換まで使用停止",
    note: "",
    savedAt: "2026-07-10T00:00:00.000Z",
  };
}

describe("summarizeInspection", () => {
  it("不良数と使用可否を集計", () => {
    const s = summarizeInspection(make());
    expect(s.ngCount).toBe(1);
    expect(s.usable).toBe(false);
    expect(EQUIP_KIND_JA[s.equipKind]).toBe("移動式クレーン");
  });
});

describe("inspectionToCsv", () => {
  it("ヘッダー＋項目行、結果を和名化", () => {
    const csv = inspectionToCsv(make());
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(KIND_ITEMS["mobile-crane"].length + 1);
    expect(lines[0]).toContain("点検項目");
    expect(lines[1]).toContain("移動式クレーン");
    expect(lines).toContain(lines.find((l) => l.includes("不良")) ?? "");
  });
});
