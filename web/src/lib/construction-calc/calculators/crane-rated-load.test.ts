import { describe, it, expect } from "vitest";
import { craneRatedLoadCalculator } from "./crane-rated-load";
import { normalizeValues } from "../schema";

/**
 * クレーン必要定格総荷重の数値固定テスト。
 * 定格総荷重 = 吊り荷 + 吊り具（クレーン則2条の定義）から独立に確認。
 * メーカー定格表は載せない方針＝出力は「必要値」と「表で要確認」の誘導であることも固定。
 */
const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(craneRatedLoadCalculator, raw);
  expect(errors).toEqual([]);
  return craneRatedLoadCalculator.compute(values);
};

describe("crane-rated-load", () => {
  it("吊り荷3t＋吊り具200kg → 必要定格総荷重3.2t・余裕10%で3.52t", () => {
    const out = run({ loadKg: 3000, rigKg: 200, marginPct: 10 });
    expect(out.value).toBe("3.52"); // (3000+200)*1.1/1000
    expect(out.items.find((i) => i.label.includes("吊り荷＋吊り具"))?.value).toContain("3.2t");
  });

  it("余裕0%なら推奨値＝必要定格総荷重", () => {
    const out = run({ loadKg: 5000, rigKg: 300, marginPct: 0 });
    expect(out.value).toBe("5.3");
  });

  it("メーカー定格表を載せず『表で要確認』へ誘導する", () => {
    const out = run({ loadKg: 3000, rigKg: 200, marginPct: 10 });
    expect(out.items.find((i) => i.label.includes("作業半径"))?.value).toContain("定格総荷重表で要確認");
    expect(out.warnings.join("\n")).toContain("定格総荷重表");
  });

  it("余裕率が推奨未満なら余裕を促す注意を出す", () => {
    const out = run({ loadKg: 3000, rigKg: 200, marginPct: 5 });
    expect(out.warnings.join("\n")).toContain("余裕");
  });

  it("常に作業計画（66条の2）の注意を含む", () => {
    const out = run({ loadKg: 3000, rigKg: 200, marginPct: 10 });
    expect(out.warnings.join("\n")).toContain("作業計画");
  });
});
