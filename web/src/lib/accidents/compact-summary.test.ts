import { describe, expect, it } from "vitest";
import { compactAccidentSummary } from "./compact-summary";

describe("compactAccidentSummary", () => {
  it("事故カードには最初の一文だけを返す", () => {
    expect(
      compactAccidentSummary("足場から墜落した。続く長い背景説明です。"),
    ).toBe("足場から墜落した。");
  });

  it("長い一文を上限内へ短縮する", () => {
    const result = compactAccidentSummary("あ".repeat(100), 20);
    expect(result).toHaveLength(20);
    expect(result.endsWith("…")).toBe(true);
  });
});
