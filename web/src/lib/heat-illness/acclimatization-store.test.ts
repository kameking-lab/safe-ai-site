import { describe, it, expect } from "vitest";
import {
  addDaysIso,
  generatePlanDays,
  planProgress,
  planToCsv,
  DEFAULT_RAMP,
  type AcclimatizationPlan,
} from "./acclimatization-store";

describe("addDaysIso", () => {
  it("月跨ぎ・うるう年もタイムゾーンに依存せず加算する", () => {
    expect(addDaysIso("2026-07-01", 6)).toBe("2026-07-07");
    expect(addDaysIso("2026-07-30", 3)).toBe("2026-08-02");
    expect(addDaysIso("2024-02-28", 1)).toBe("2024-02-29"); // うるう年
    expect(addDaysIso("2026-07-01", 0)).toBe("2026-07-01");
  });
});

describe("generatePlanDays", () => {
  it("最低7日生成し、日付が連続、目安は既定ランプ", () => {
    const days = generatePlanDays("2026-07-01");
    expect(days).toHaveLength(7);
    expect(days[0]!.date).toBe("2026-07-01");
    expect(days[6]!.date).toBe("2026-07-07");
    expect(days.map((d) => d.targetPercent)).toEqual(DEFAULT_RAMP);
    expect(days[6]!.targetPercent).toBe(100);
  });

  it("7日未満を指定しても最低7日に切り上げる", () => {
    expect(generatePlanDays("2026-07-01", 3)).toHaveLength(7);
  });

  it("7日超は指定日数まで生成し、超過分の目安は100%", () => {
    const days = generatePlanDays("2026-07-01", 10);
    expect(days).toHaveLength(10);
    expect(days[7]!.targetPercent).toBe(100);
    expect(days[9]!.date).toBe("2026-07-10");
  });
});

describe("planProgress", () => {
  it("実施数と完了判定を返す", () => {
    const days = generatePlanDays("2026-07-01");
    expect(planProgress({ days })).toEqual({ doneCount: 0, total: 7, complete: false });
    days.forEach((d) => (d.done = true));
    expect(planProgress({ days })).toEqual({ doneCount: 7, total: 7, complete: true });
  });
});

describe("planToCsv", () => {
  it("ヘッダー＋日数分の行を出力し、区分・体調・実施を和名化", () => {
    const plan: AcclimatizationPlan = {
      id: "p1",
      workerName: "新人 一郎",
      category: "new",
      siteName: "○○現場",
      startDate: "2026-07-01",
      savedAt: "2026-07-01T00:00:00.000Z",
      days: generatePlanDays("2026-07-01").map((d, i) =>
        i === 0 ? { ...d, done: true, condition: "ok" as const, note: "問題なし" } : d,
      ),
    };
    const lines = planToCsv(plan).split("\r\n");
    expect(lines).toHaveLength(8); // header + 7
    expect(lines[0]).toContain("目安(%)");
    expect(lines[1]).toContain("新規入場者");
    expect(lines[1]).toContain("済");
    expect(lines[1]).toContain("異常なし");
  });
});
