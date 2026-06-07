import { describe, it, expect } from "vitest";
import {
  summarizeWorkerQual,
  qualRosterToCsv,
  PRESET_QUALIFICATIONS,
  type WorkerQual,
} from "./qualification-store";

function w(over: Partial<WorkerQual> = {}): WorkerQual {
  return {
    id: "w1",
    workerName: "作業 太郎",
    company: "△△工業",
    trade: "とび工",
    quals: [
      { id: "q1", name: "玉掛け 技能講習", date: "2020-05-01" },
      { id: "q2", name: "フルハーネス型墜落制止用器具 特別教育", date: "2022-06-10" },
    ],
    note: "",
    savedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("PRESET_QUALIFICATIONS", () => {
  it("主要な特別教育・技能講習を含む", () => {
    expect(PRESET_QUALIFICATIONS.length).toBeGreaterThanOrEqual(10);
    expect(PRESET_QUALIFICATIONS.some((q) => q.includes("フルハーネス"))).toBe(true);
    expect(PRESET_QUALIFICATIONS.some((q) => q.includes("玉掛け"))).toBe(true);
  });
});

describe("summarizeWorkerQual", () => {
  it("保有資格数を集計", () => {
    expect(summarizeWorkerQual(w()).qualCount).toBe(2);
  });
});

describe("qualRosterToCsv", () => {
  it("1行=作業者×資格、和名ヘッダー", () => {
    const csv = qualRosterToCsv([w(), w({ id: "w2", workerName: "作業 次郎", quals: [] })]);
    const lines = csv.split("\r\n");
    // header + 2(太郎の資格2) + 1(次郎は資格0で1行)
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("取得・修了日");
    expect(lines[1]).toContain("玉掛け 技能講習");
    expect(lines[3]).toContain("作業 次郎");
  });
});
