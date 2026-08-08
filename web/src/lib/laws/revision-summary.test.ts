import { describe, expect, it } from "vitest";
import { compactLawRevisionSummary } from "./revision-summary";

describe("compactLawRevisionSummary", () => {
  it("各カードで繰り返す方式・日付・原文確認文を本文から除く", () => {
    expect(
      compactLawRevisionSummary(
        "安衛則の最新改正（出典: e-Gov法令検索の構造データ）。改正法令「労働安全衛生規則の一部を改正する省令」。公布 2024-04-25、施行日 2026-07-01。改正内容の詳細はe-Govの原文で必ずご確認ください。",
      ),
    ).toBe(
      "安衛則の最新改正。改正法令「労働安全衛生規則の一部を改正する省令」。",
    );
  });
});
