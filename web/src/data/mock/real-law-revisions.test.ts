import { describe, expect, it } from "vitest";
import { realLawRevisions } from "./real-law-revisions";

function revision(id: string) {
  const item = realLawRevisions.find((entry) => entry.id === id);
  expect(item, `missing revision ${id}`).toBeDefined();
  return item!;
}

describe("一次資料で固定した高リスク法改正メタデータ", () => {
  it("熱中症対策は省令第57号と新第612条の2の義務内容を示す", () => {
    const item = revision("lr-real-2025-003");
    expect(item.revisionNumber).toBe("令和7年厚生労働省令第57号");
    expect(item.official_notice_number).toBe("厚生労働省令第57号");
    expect(item.summary).toContain("報告体制");
    expect(item.summary).toContain("手順作成");
    expect(item.summary).not.toContain("休憩場所の設置");
  });

  it("基準日より後の施行日を正しく区別する", () => {
    expect(revision("lr-real-2027-001").enforcement_date).toBe("2028-04-01");
    expect(revision("lr-real-2027-002").enforcement_date).toBe("2027-01-01");
  });

  it("2026年4月施行済みの化学物質追加を予定扱いしない", () => {
    const item = revision("lr-real-2026-003");
    expect(item.enforcement_date).toBe("2026-04-01");
    expect(`${item.title} ${item.revisionNumber} ${item.summary}`).not.toContain("予定");
    expect(item.summary).toContain("施行済み");
  });
});
