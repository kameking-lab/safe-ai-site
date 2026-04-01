import { describe, expect, it } from "vitest";
import { mockSummaryService } from "@/lib/services/summary-service";

describe("summary-service", () => {
  const service = mockSummaryService;

  it("既存の法改正IDで要約を返す", async () => {
    const result = await service.getSummaryByRevisionId({ revisionId: "lr-001" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.summary.threeLineSummary.length).toBe(3);
    expect(result.data.summary.workplaceActions.length).toBeGreaterThan(0);
  });

  it("存在しない法改正IDでNOT_FOUNDを返す", async () => {
    const result = await service.getSummaryByRevisionId({ revisionId: "unknown" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.retryable).toBe(false);
  });
});
