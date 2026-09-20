import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FatalAccidentsResultsFallback } from "./fatal-accidents-results-fallback";

describe("FatalAccidentsResultsFallback", () => {
  it("明示的なstreaming確認中は結果と誤認させず、巨大な30カード予約を作らない", () => {
    const { container } = render(<FatalAccidentsResultsFallback />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toContain("死亡事故データベースを読み込んでいます");
    expect(status.textContent).toContain("検索結果ではありません");
    expect(
      container.querySelectorAll("[data-fatal-accidents-loading-grid] > li"),
    ).toHaveLength(3);
    expect(
      container
        .querySelector("[data-fatal-accidents-loading-shell]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      container
        .querySelector("[data-fatal-accidents-loading-shell]")
        ?.className,
    ).toContain("motion-reduce:");
  });
});
