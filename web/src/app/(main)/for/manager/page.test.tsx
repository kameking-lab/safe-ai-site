import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ForManagerPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("/for/manager page (企業の安全衛生担当者)", () => {
  it("Hero に担当者向けの見出しを描画", () => {
    render(<ForManagerPage />);
    expect(screen.getAllByText(/体制づくりから月次運用まで/).length).toBeGreaterThan(0);
  });

  it("主要セクションのアンカーが存在 (setup/duties/tools/monthly)", () => {
    render(<ForManagerPage />);
    for (const id of ["setup", "duties", "tools", "monthly"]) {
      expect(document.getElementById(id), `#${id} が見つからない`).toBeTruthy();
    }
  });

  it("規模別義務早見の代表項目を表示 (衛生管理者/産業医/ストレスチェック)", () => {
    render(<ForManagerPage />);
    expect(screen.getByText(/衛生管理者の選任/)).toBeDefined();
    expect(screen.getByText(/産業医の選任/)).toBeDefined();
    expect(screen.getByText(/ストレスチェックの実施/)).toBeDefined();
    expect(screen.getAllByText(/常時50人以上/).length).toBeGreaterThan(0);
  });

  it("実在する内部リンクへ誘導 (年次計画/健診/メンタル/化学物質RA/法改正)", () => {
    render(<ForManagerPage />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/strategy/plan-generator");
    expect(links).toContain("/health-checkup-scheduler");
    expect(links).toContain("/mental-health-management");
    expect(links).toContain("/chemical-ra");
    expect(links).toContain("/whats-new");
    expect(links).toContain("/chatbot");
  });

  it("個人運営・登録番号260022 を明示", () => {
    render(<ForManagerPage />);
    expect(screen.getByText(/個人運営の研究プロジェクト/)).toBeDefined();
    expect(screen.getAllByText(/260022/).length).toBeGreaterThan(0);
  });
});
