import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import CourtCasesPage from "./page";

describe("/court-cases ハブ 柱0 44pxタップ標的", () => {
  it("h1直下の「3つの責任ガイド」リンクが 44px タップ標的を満たす", () => {
    render(<CourtCasesPage />);
    const link = screen.getByRole("link", { name: /3つの責任」ガイド/ });
    expect(link.className).toContain("min-h-[44px]");
    expect(link.className).toContain("items-center");
  });

  it("h1直下の「A4まとめ資料で印刷／PDF保存」リンクが 44px タップ標的を満たす", () => {
    render(<CourtCasesPage />);
    const link = screen.getByRole("link", { name: /A4まとめ資料で印刷／PDF保存/ });
    expect(link.className).toContain("min-h-[44px]");
    expect(link.className).toContain("items-center");
  });
});
