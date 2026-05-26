import { describe, expect, it } from "vitest";
import {
  buildDefaultMeetingRecord,
  normalizeMeetingRecord,
  computePriority,
  aggregateMachines,
  emptyContractorRow,
  buildDefaultChecklist,
} from "@/lib/meeting/schema";

describe("meeting schema", () => {
  it("computePriority: 重大性×可能性 を 1-4 に写像", () => {
    expect(computePriority(1, 1)).toBe(1); // 1
    expect(computePriority(3, 1)).toBe(2); // 3
    expect(computePriority(2, 2)).toBe(2); // 4
    expect(computePriority(3, 2)).toBe(3); // 6
    expect(computePriority(3, 3)).toBe(4); // 9
  });

  it("aggregateMachines: 業者の使用機械を集計", () => {
    const rows = [
      { ...emptyContractorRow(), machines: "バックホウ、ダンプ" },
      { ...emptyContractorRow(), machines: "バックホウ" },
    ];
    const agg = aggregateMachines(rows);
    const backhoe = agg.find((m) => m.name === "バックホウ");
    expect(backhoe?.count).toBe(2);
    expect(agg.find((m) => m.name === "ダンプ")?.count).toBe(1);
  });

  it("buildDefaultChecklist: 8カテゴリ・全項目 na 初期化", () => {
    const cl = buildDefaultChecklist();
    expect(cl).toHaveLength(8);
    expect(cl.every((c) => c.items.length > 0)).toBe(true);
    expect(cl.flatMap((c) => c.items).every((i) => i.status === "na")).toBe(true);
  });

  it("normalizeMeetingRecord: 壊れた入力を既定化し machines を自動集計", () => {
    const norm = normalizeMeetingRecord({ contractors: [{ companyName: "A建設", machines: "クレーン" }] });
    expect(norm.contractors[0].companyName).toBe("A建設");
    expect(norm.machines.find((m) => m.name === "クレーン")?.count).toBe(1);
    expect(norm.checklist).toHaveLength(8);
  });

  it("normalizeMeetingRecord: null/未定義は完全な既定を返す", () => {
    const norm = normalizeMeetingRecord(null);
    expect(norm.contractors.length).toBeGreaterThan(0);
    expect(norm.checklist).toHaveLength(8);
  });

  it("normalizeMeetingRecord: 点検 status を key で引き継ぐ", () => {
    const def = buildDefaultMeetingRecord();
    const firstKey = def.checklist[0].items[0].key;
    def.checklist[0].items[0].status = "ok";
    const norm = normalizeMeetingRecord(JSON.parse(JSON.stringify(def)));
    expect(norm.checklist[0].items[0].status).toBe("ok");
    expect(norm.checklist[0].items[0].key).toBe(firstKey);
  });
});
