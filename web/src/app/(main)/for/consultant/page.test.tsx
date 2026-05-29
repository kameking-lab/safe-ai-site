import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ForConsultantPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("/for/consultant page (専門家向け)", () => {
  it("Hero に専門家向けの見出しを描画", () => {
    render(<ForConsultantPage />);
    expect(screen.getAllByText(/下調べと顧問先支援を、1画面で/).length).toBeGreaterThan(0);
  });

  it("3カテゴリのアンカーが存在 (research/analysis/support/evidence)", () => {
    render(<ForConsultantPage />);
    for (const id of ["research", "analysis", "support", "evidence"]) {
      expect(document.getElementById(id), `#${id} が見つからない`).toBeTruthy();
    }
  });

  it("リサーチ・分析・支援ツールへの実在リンクを含む", () => {
    render(<ForConsultantPage />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/law-search");
    expect(links).toContain("/circulars");
    expect(links).toContain("/law-hierarchy");
    expect(links).toContain("/accidents-reports");
    expect(links).toContain("/accidents-analytics");
    expect(links).toContain("/chemical-database");
    expect(links).toContain("/strategy/plan-generator");
    expect(links).toContain("/about");
  });

  it("エビデンス・出典の明示と登録番号260022", () => {
    render(<ForConsultantPage />);
    expect(screen.getByText(/エビデンスと出典/)).toBeDefined();
    expect(screen.getAllByText(/260022/).length).toBeGreaterThan(0);
  });
});
