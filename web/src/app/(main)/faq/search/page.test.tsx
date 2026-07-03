import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FAQSearchPage from "./page";

describe("/faq/search 検索input 柱0 44pxタップ標的", () => {
  it("検索inputが min-h-[44px] を満たす", () => {
    render(<FAQSearchPage />);
    const input = screen.getByPlaceholderText(/ストレスチェック/);
    expect(input.className).toContain("min-h-[44px]");
  });
});
