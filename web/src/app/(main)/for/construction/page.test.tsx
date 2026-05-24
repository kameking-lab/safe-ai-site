import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ForConstructionPage from "./page";

// RoleAnchorScroller は client、useSearchParams を mock
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("/for/construction page", () => {
  it("Hero に建設業の見出しを描画", () => {
    render(<ForConstructionPage />);
    expect(screen.getAllByText(/建設現場の安全衛生、ここに集約/).length).toBeGreaterThan(0);
  });

  it("役職別 3 セクションのアンカーが存在", () => {
    render(<ForConstructionPage />);
    const foreman = document.getElementById("for-foreman");
    const manager = document.getElementById("for-manager");
    const supervisor = document.getElementById("for-supervisor");
    expect(foreman).toBeTruthy();
    expect(manager).toBeTruthy();
    expect(supervisor).toBeTruthy();
  });

  it("9セクション (today/foreman/manager/supervisor/monthly/laws/chemical/stats/circulars) のアンカー", () => {
    render(<ForConstructionPage />);
    for (const id of ["today", "for-foreman", "for-manager", "for-supervisor", "monthly", "laws", "chemical", "stats", "circulars"]) {
      expect(document.getElementById(id), `#${id} が見つからない`).toBeTruthy();
    }
  });

  it("建設業 KY プリセット3作業を表示 (鉄骨建方/型枠解体/コンクリート打設)", () => {
    render(<ForConstructionPage />);
    expect(screen.getByText(/鉄骨建方作業/)).toBeDefined();
    expect(screen.getByText(/型枠解体作業/)).toBeDefined();
    expect(screen.getByText(/コンクリート打設/)).toBeDefined();
  });

  it("建設業労災実数値 (厚労省データ) を表示", () => {
    render(<ForConstructionPage />);
    expect(screen.getByText(/66,713/)).toBeDefined();
  });

  it("化学物質 20 物質クイックリンク (CONSTRUCTION_PRIORITY_CAS の代表物質)", () => {
    render(<ForConstructionPage />);
    expect(screen.getByText(/トルエン/)).toBeDefined();
    expect(screen.getAllByText(/石綿/).length).toBeGreaterThan(0); // 物質名 + 通達名で複数出る
    expect(screen.getByText(/ジクロロメタン/)).toBeDefined();
  });

  it("主要内部リンク (KY/chatbot/signage/plan-generator/chemical-database) を含む", () => {
    render(<ForConstructionPage />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/ky?industry=construction");
    expect(links).toContain("/signage");
    expect(links).toContain("/strategy/plan-generator?industry=construction");
    expect(links).toContain("/chemical-ra");
    expect(links).toContain("/chemical-database");
    expect(links).toContain("/accidents-reports/construction");
    expect(links).toContain("/chatbot");
    expect(links).toContain("/industries/construction"); // 既存ハブへの相互リンク
  });

  it("「個人運営研究プロジェクト」「登録番号260022」を明示", () => {
    render(<ForConstructionPage />);
    expect(screen.getByText(/個人運営の研究プロジェクト/)).toBeDefined();
    expect(screen.getAllByText(/260022/).length).toBeGreaterThan(0);
  });

  it("月次運用テーブル (4月/5〜9月/通年 等) を表示", () => {
    render(<ForConstructionPage />);
    expect(screen.getByText(/新規入場者教育/)).toBeDefined();
    expect(screen.getAllByText(/熱中症/).length).toBeGreaterThan(0); // 月次 + 通達セクション
  });

  it("関連通達5件を含む", () => {
    render(<ForConstructionPage />);
    expect(screen.getAllByText(/フルハーネス/).length).toBeGreaterThan(0);
    expect(screen.getByText(/足場からの墜落防止措置/)).toBeDefined();
    expect(screen.getByText(/石綿事前調査結果の電子報告/)).toBeDefined();
    expect(screen.getByText(/一人親方/)).toBeDefined();
  });
});
