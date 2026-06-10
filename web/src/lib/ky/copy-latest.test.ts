import { describe, it, expect } from "vitest";
import { copyKyForToday } from "./copy-latest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

function sampleRecord() {
  const r = normalizeKyInstructionRecord({});
  r.siteName = "○○ビル新築工事";
  r.foremanName = "山田太郎";
  r.coop1Name = "山田組";
  r.workDateYear = "2026";
  r.workDateMonth = "5";
  r.workDateDay = "24";
  r.weather = "晴れ";
  r.temperature = "22";
  r.workRows[0].workDetail = "鉄骨建方";
  r.riskRows[1].hazard = "墜落";
  r.riskRows[1].reduction = "フルハーネス";
  r.participants[0].name = "佐藤";
  r.participants[0].preWork = "良好";
  r.participants[0].onExit = "異常なし";
  r.breaks[0] = "10:00-10:15";
  r.closingNote = "本日異常なし";
  r.teamGoal = "高所では必ず親綱に掛けよう";
  return r;
}

describe("copyKyForToday", () => {
  it("作業内容・危険・対策・参加者氏名・現場名・職長・行動目標を引き継ぐ", () => {
    const copy = copyKyForToday(sampleRecord(), new Date(2026, 4, 25));
    expect(copy.siteName).toBe("○○ビル新築工事");
    expect(copy.foremanName).toBe("山田太郎");
    expect(copy.coop1Name).toBe("山田組");
    expect(copy.workRows[0].workDetail).toBe("鉄骨建方");
    expect(copy.riskRows[1].hazard).toBe("墜落");
    expect(copy.riskRows[1].reduction).toBe("フルハーネス");
    expect(copy.participants[0].name).toBe("佐藤");
    expect(copy.teamGoal).toBe("高所では必ず親綱に掛けよう");
  });
  it("当日固有の項目はリセットされる", () => {
    const copy = copyKyForToday(sampleRecord(), new Date(2026, 4, 25));
    expect(copy.workDateYear).toBe("2026");
    expect(copy.workDateMonth).toBe("5");
    expect(copy.workDateDay).toBe("25");
    expect(copy.weather).toBe("");
    expect(copy.temperature).toBe("");
    expect(copy.participants[0].preWork).toBe("");
    expect(copy.participants[0].onExit).toBe("");
    expect(copy.breaks.every((b) => b === "")).toBe(true);
    expect(copy.closingNote).toBe("");
  });
});
