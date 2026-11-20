import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArticlesIndexPage from "./page";

describe("解説記事一覧の公開導線", () => {
  it("既存のガイド3本へ案内する", () => {
    render(<ArticlesIndexPage />);
    const guides = screen.getByRole("navigation", { name: "現場の安全ガイド" });

    expect(within(guides).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/guides/ky-sheet",
      "/guides/chemical-ra-create-simple",
      "/guides/safety-signage",
    ]);
  });
});
