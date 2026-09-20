import { describe, expect, it } from "vitest";
import { getAnalyticsAggregates } from "./aggregators";
import { buildAnalyticsInsights } from "./insights";

describe("事故分析の短い考察", () => {
  it("現在の対象件数と同じ母集団から3点を作り、リスク断定を避ける", () => {
    const aggregates = getAnalyticsAggregates({ year: 2024, source: "official" });
    const insights = buildAnalyticsInsights(aggregates);

    expect(aggregates.meta.filteredCases).toBeGreaterThan(0);
    expect(insights).toHaveLength(3);
    const expectedKnownCounts = [
      aggregates.meta.coverage.type.known,
      aggregates.meta.coverage.month.known,
      aggregates.meta.coverage.cause.known,
    ];
    for (const [index, item] of insights.entries()) {
      expect(item.description).toContain("収録事例内の構成比");
      expect(item.knownCount).toBe(expectedKnownCounts[index]);
      expect(item.description).toContain(
        `母数：${item.knownFieldLabel}が確認できる ${item.knownCount.toLocaleString("ja-JP")}件`,
      );
      expect(item.description).toContain("リスクの高さを示すものではありません");
      expect(item.description).not.toContain("危険");
      expect(item.description).not.toContain("重篤化しやすい");
    }
  });
});
