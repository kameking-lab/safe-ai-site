import { describe, it, expect } from "vitest";
import {
  defaultInductionItems,
  summarizeInduction,
  rosterToCsv,
  DEFAULT_INDUCTION_ITEMS,
  type InductionRecord,
} from "./induction-store";

function makeRecord(over: Partial<InductionRecord> = {}): InductionRecord {
  const items = defaultInductionItems();
  items[0]!.checked = true;
  items[1]!.checked = true;
  return {
    id: "ind-1",
    date: "2026-07-10",
    siteName: "○○新築工事",
    workerName: "新人 太郎",
    company: "△△工業",
    trade: "鉄筋工",
    educator: "職長 山田",
    items,
    note: "経験3年",
    confirmedWorker: true,
    confirmedEducator: true,
    savedAt: "2026-07-10T00:00:00.000Z",
    ...over,
  };
}

describe("defaultInductionItems", () => {
  it("安衛則35条8項目＋建設受入項目を含み、初期は全て未チェック", () => {
    const items = defaultInductionItems();
    expect(items.length).toBe(DEFAULT_INDUCTION_ITEMS.length);
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(items.every((i) => i.checked === false)).toBe(true);
    expect(items.find((i) => i.key === "procedure")?.label).toContain("作業手順");
  });
});

describe("summarizeInduction", () => {
  it("実施項目数と総数を集計", () => {
    const s = summarizeInduction(makeRecord());
    expect(s.total).toBe(DEFAULT_INDUCTION_ITEMS.length);
    expect(s.doneCount).toBe(2);
    expect(s.workerName).toBe("新人 太郎");
  });
});

describe("rosterToCsv", () => {
  it("ヘッダー＋1名1行、確認は○、実施/全の形式", () => {
    const csv = rosterToCsv([makeRecord(), makeRecord({ id: "ind-2", workerName: "新人 花子", confirmedEducator: false })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2
    expect(lines[0]).toContain("教育項目(実施/全)");
    expect(lines[1]).toContain("新人 太郎");
    expect(lines[1]).toContain(`2/${DEFAULT_INDUCTION_ITEMS.length}`);
    expect(lines[1]).toContain("○"); // 本人確認○
  });

  it("カンマを含む備考はクォートされる", () => {
    const csv = rosterToCsv([makeRecord({ note: "玉掛け, フルハーネス済" })]);
    expect(csv).toContain('"玉掛け, フルハーネス済"');
  });
});
