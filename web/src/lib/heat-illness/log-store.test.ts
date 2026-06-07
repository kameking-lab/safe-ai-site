import { describe, it, expect } from "vitest";
import {
  summarizeRecord,
  recordToCsv,
  RISK_RANK,
  type HeatLogRecord,
} from "./log-store";

function makeRecord(): HeatLogRecord {
  return {
    id: "rec-1",
    date: "2026-07-15",
    siteName: "○○ビル新築工事",
    author: "現場 太郎",
    savedAt: "2026-07-15T09:00:00.000Z",
    entries: [
      {
        id: "e1",
        time: "08:00",
        airTempC: 30,
        humidity: 60,
        globeTempC: 35,
        environment: "outdoor",
        workIntensity: "moderate",
        acclimatization: "acclimatized",
        wbgt: 26.4,
        riskLevel: "caution",
        riskLabel: "注意",
        measures: "水分補給を励行",
        note: "",
      },
      {
        id: "e2",
        time: "14:00",
        airTempC: 35,
        humidity: 70,
        globeTempC: null,
        environment: "outdoor",
        workIntensity: "heavy",
        acclimatization: "non-acclimatized",
        wbgt: 31.2,
        riskLevel: "danger",
        riskLabel: "危険",
        measures: "作業中止、日陰で休憩",
        note: "A氏に軽い倦怠感, 経過観察",
      },
    ],
  };
}

describe("summarizeRecord", () => {
  it("最高WBGTと最悪リスク区分を集計する", () => {
    const s = summarizeRecord(makeRecord());
    expect(s.entryCount).toBe(2);
    expect(s.maxWbgt).toBe(31.2);
    expect(s.maxRiskLevel).toBe("danger");
    expect(s.siteName).toBe("○○ビル新築工事");
  });

  it("記録ゼロ件なら max は null", () => {
    const rec = { ...makeRecord(), entries: [] };
    const s = summarizeRecord(rec);
    expect(s.entryCount).toBe(0);
    expect(s.maxWbgt).toBeNull();
    expect(s.maxRiskLevel).toBeNull();
  });
});

describe("RISK_RANK", () => {
  it("safe < caution < warning < severe-warning < danger の順序", () => {
    expect(RISK_RANK.safe).toBeLessThan(RISK_RANK.caution);
    expect(RISK_RANK.caution).toBeLessThan(RISK_RANK.warning);
    expect(RISK_RANK.warning).toBeLessThan(RISK_RANK["severe-warning"]);
    expect(RISK_RANK["severe-warning"]).toBeLessThan(RISK_RANK.danger);
  });
});

describe("recordToCsv", () => {
  it("ヘッダー＋行数が一致し、和名変換される", () => {
    const csv = recordToCsv(makeRecord());
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 entries
    expect(lines[0]).toContain("WBGT(℃)");
    expect(lines[1]).toContain("屋外");
    expect(lines[1]).toContain("中程度");
    expect(lines[2]).toContain("危険");
  });

  it("カンマ・改行を含むセルはクォートされる", () => {
    const csv = recordToCsv(makeRecord());
    // note に「, 」を含む行はダブルクォートで囲まれる
    expect(csv).toContain('"A氏に軽い倦怠感, 経過観察"');
  });

  it("黒球温度 null は空セル", () => {
    const csv = recordToCsv(makeRecord());
    const cols = csv.split("\r\n")[2]!.split(",");
    // 黒球温度は7列目（index 6）
    expect(cols[6]).toBe("");
  });
});
