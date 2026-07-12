import { describe, it, expect } from "vitest";
import { shoringMemberCheckCalculator, SHORING_INSPECTION_INTERVAL_MAX_DAYS } from "./shoring-member-check";
import { normalizeValues } from "../schema";

/**
 * 土止め支保工の部材基準チェック（安衛則368〜375条）の数値固定テスト。
 * 期待値は条文の文言（点検間隔7日・作業主任者選任 等）から独立に固定した判定値。
 */
describe("shoring-member-check: 定数", () => {
  it("点検間隔の上限は7日（安衛則第373条）", () => {
    expect(SHORING_INSPECTION_INTERVAL_MAX_DAYS).toBe(7);
  });
});

describe("shoring-member-check: compute / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(shoringMemberCheckCalculator, raw);
    expect(errors).toEqual([]);
    return shoringMemberCheckCalculator.compute(values);
  };

  it("既定値（全項目適合）は基準適合を返す", () => {
    const out = run({});
    expect(out.headline).toBe("基準適合");
    expect(out.tone).toBe("safe");
  });

  it("部材の損傷ありは基準不適合（第368条）", () => {
    const out = run({ materialCondition: "damaged" });
    expect(out.headline).toBe("基準不適合");
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("第368条"))?.tone).toBe("danger");
  });

  it("組立図なしは基準不適合（第370条）", () => {
    const out = run({ hasAssemblyDrawing: "no" });
    expect(out.tone).toBe("danger");
  });

  it("圧縮材の継手が突合せ以外は基準不適合（第371条2号）", () => {
    const out = run({ compressionJointButt: "no" });
    expect(out.tone).toBe("danger");
  });

  it("点検間隔7日以内は適合、8日は不適合（境界値・第373条）", () => {
    expect(run({ daysSinceInspection: 7 }).tone).toBe("safe");
    expect(run({ daysSinceInspection: 8 }).tone).toBe("danger");
  });

  it("地震後まだ点検していない場合は7日以内でも基準不適合（第373条）", () => {
    const out = run({ daysSinceInspection: 1, recentEventInspection: "pending" });
    expect(out.tone).toBe("danger");
  });

  it("地震該当・点検済みは基準適合", () => {
    const out = run({ daysSinceInspection: 1, recentEventInspection: "done" });
    expect(out.tone).toBe("safe");
  });

  it("作業主任者未選任は基準不適合（第374条）", () => {
    const out = run({ hasSupervisor: "no" });
    expect(out.tone).toBe("danger");
  });

  it("作業主任者の職務（第375条）の警告を常に含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("第375条");
  });

  it("つり綱・つり袋の警告を常に含む（第372条2号）", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("つり綱");
  });

  it("複数不適合時は該当項目名を要約に含む", () => {
    const out = run({ materialCondition: "damaged", hasSupervisor: "no" });
    expect(out.summary).toContain("材料");
    expect(out.summary).toContain("作業主任者");
  });
});
