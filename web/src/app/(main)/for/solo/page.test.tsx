import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ForSoloPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("/for/solo page (一人親方)", () => {
  it("Hero に一人親方の見出しを描画", () => {
    render(<ForSoloPage />);
    expect(screen.getAllByText(/自分の安全は、自分で回す/).length).toBeGreaterThan(0);
  });

  it("主要セクションのアンカーが存在 (today/solo-ky/systems/laws/chemical/stats/circulars)", () => {
    render(<ForSoloPage />);
    for (const id of ["today", "solo-ky", "systems", "laws", "chemical", "stats", "circulars"]) {
      expect(document.getElementById(id), `#${id} が見つからない`).toBeTruthy();
    }
  });

  it("特別加入・個人事業者の制度に言及", () => {
    render(<ForSoloPage />);
    expect(screen.getAllByText(/特別加入/).length).toBeGreaterThan(0);
    expect(screen.getByText(/個人事業者等の安全衛生対策の強化/)).toBeDefined();
  });

  it("実在する内部リンクへ誘導 (KY/熱中症/資格判定/化学物質/事故)", () => {
    render(<ForSoloPage />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/ky?industry=construction");
    expect(links).toContain("/heat-illness-prevention");
    expect(links).toContain("/education-certification/finder");
    expect(links).toContain("/chemical-ra");
    expect(links).toContain("/accidents");
    expect(links).toContain("/chatbot");
  });

  it("個人運営・登録番号260022 を明示", () => {
    render(<ForSoloPage />);
    expect(screen.getByText(/個人運営の研究プロジェクト/)).toBeDefined();
    expect(screen.getAllByText(/260022/).length).toBeGreaterThan(0);
  });
});
