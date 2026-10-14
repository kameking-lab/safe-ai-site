import { describe, expect, it } from "vitest";
import { estimateReskillingCost, type TrainingEstimateInput } from "./subsidy-calculator";
const BASE: TrainingEstimateInput = {
  companySize: "small",
  method: "classroom",
  hours: 10,
  eligibleCostPerPerson: 1_000_000,
  conditionsConfirmed: true,
};

describe("リスキリングの1人分経費助成の参考式", () => {
  it.each([
    ["small", 10, 300_000],
    ["small", 99.9, 300_000],
    ["small", 100, 400_000],
    ["small", 199.9, 400_000],
    ["small", 200, 500_000],
    ["large", 10, 200_000],
    ["large", 100, 250_000],
    ["large", 200, 300_000],
  ] as const)("%sの%s時間は上限%s円", (companySize, hours, cap) => {
    expect(estimateReskillingCost({ ...BASE, companySize, hours })).toMatchObject({
      cap,
      amount: cap,
    });
  });
  it.each([
    ["small", 150_000, 0.75],
    ["large", 100_000, 0.6],
  ] as const)("%sのeラーニングは時間帯によらず%s円上限", (companySize, cap, rate) => {
    expect(
      estimateReskillingCost({ ...BASE, method: "elearning", hours: 200, companySize }),
    ).toMatchObject({ cap, amount: cap, rate });
  });
  it("上限より低い経費は率で計算し、賃金助成を加えない", () => {
    expect(estimateReskillingCost({ ...BASE, eligibleCostPerPerson: 100_000 })).toMatchObject({
      amount: 75_000,
      remainingCost: 25_000,
    });
    expect(
      estimateReskillingCost({ ...BASE, companySize: "large", eligibleCostPerPerson: 100_000 }),
    ).toMatchObject({ amount: 60_000, remainingCost: 40_000 });
  });
  it.each([
    { conditionsConfirmed: false },
    { hours: 9.99 },
    { hours: NaN },
    { eligibleCostPerPerson: 0 },
    { eligibleCostPerPerson: -1 },
    { eligibleCostPerPerson: Infinity },
    { eligibleCostPerPerson: 1.5 },
  ])("未確認・短時間・不正な金額は試算しない: %j", (invalid) => {
    expect(estimateReskillingCost({ ...BASE, ...invalid })).toBeNull();
  });
});
