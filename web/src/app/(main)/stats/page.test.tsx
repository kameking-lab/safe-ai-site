import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StatsPage from "./page";
import { hasAdminPageAccess } from "@/lib/server/admin-access";

vi.mock("@/lib/server/admin-access", () => ({ hasAdminPageAccess: vi.fn() }));
vi.mock("./StatsDashboard", () => ({ StatsDashboard: () => <div>管理者用解析</div> }));

describe("公開閲覧と管理者専用の利用統計", () => {
  it("一般訪問者に権限不足のAPIを読み込ませず、災害統計へ案内する", async () => {
    vi.mocked(hasAdminPageAccess).mockResolvedValue(false);
    render(await StatsPage());
    expect(screen.queryByText("管理者用解析")).toBeNull();
    expect(screen.getByText(/一般公開の利用人数や成果は掲載していません/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "労働災害の統計を見る" }).getAttribute("href")).toBe("/accidents-analytics");
  });
  it("管理者の既存ダッシュボードを維持する", async () => {
    vi.mocked(hasAdminPageAccess).mockResolvedValue(true);
    render(await StatsPage());
    expect(screen.getByText("管理者用解析")).toBeTruthy();
  });
});
