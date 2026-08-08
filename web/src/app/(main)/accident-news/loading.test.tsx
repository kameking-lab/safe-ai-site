import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccidentNewsResultsFallback } from "./accident-news-results-fallback";

describe("AccidentNewsResultsFallback", () => {
  it("明示的なstreaming確認中は結果と誤認させず、巨大な30カード予約を作らない", () => {
    const { container } = render(<AccidentNewsResultsFallback />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toContain("重大災害事例を読み込んでいます");
    expect(status.textContent).toContain("検索結果ではありません");
    expect(
      container.querySelectorAll("[data-accident-news-loading-grid] > li"),
    ).toHaveLength(3);
    expect(
      container
        .querySelector("[data-accident-news-loading-shell]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      container
        .querySelector("[data-accident-news-loading-shell]")
        ?.className,
    ).toContain("motion-reduce:");
  });
});
