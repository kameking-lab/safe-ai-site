import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AccidentDatabasePanel } from "./accident-database-panel";
import type { AccidentCase } from "@/lib/types/domain";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const base: AccidentCase = {
  id: "base",
  title: "対象事例",
  occurredOn: "2024-01-15",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "概要",
  mainCauses: [],
  preventionPoints: [],
};

describe("統計から事例検索への条件引き継ぎ", () => {
  it("URLの事故型・年・重症度を事例一覧に適用する", async () => {
    window.history.replaceState({}, "", "/accidents?acc_industries=construction&acc_hazard=fall&acc_year=2024&acc_severity=死亡");
    const cases: AccidentCase[] = [
      base,
      { ...base, id: "type", title: "転倒事例", type: "転倒" },
      { ...base, id: "year", title: "前年事例", occurredOn: "2023-01-15" },
      { ...base, id: "severity", title: "重傷事例", severity: "重傷" },
    ];
    render(
      <EasyJapaneseProvider>
        <AccidentDatabasePanel
          cases={cases}
          allCases={cases}
          selectedType="すべて"
          selectedCategory="すべて"
          onSelectType={() => {}}
          onSelectCategory={() => {}}
          status="success"
        />
      </EasyJapaneseProvider>,
    );
    await waitFor(() => expect((screen.getByLabelText("発生年") as HTMLInputElement).value).toBe("2024"));
    expect(screen.getByText("対象事例")).toBeTruthy();
    expect(screen.queryByText("転倒事例")).toBeNull();
    expect(screen.queryByText("前年事例")).toBeNull();
    expect(screen.queryByText("重傷事例")).toBeNull();
    expect((screen.getByLabelText("発生年") as HTMLInputElement).value).toBe("2024");
    expect((screen.getByLabelText("重症度") as HTMLSelectElement).value).toBe("死亡");
    expect(screen.getByLabelText("事例検索の適用条件").textContent).toContain("業種: 建設");
    window.history.replaceState({}, "", "/accidents?acc_year=2023");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect((screen.getByLabelText("発生年") as HTMLInputElement).value).toBe("2023"));
    expect(screen.queryByLabelText("事例検索の適用条件")?.textContent).not.toContain("業種: 建設");
    window.history.replaceState({}, "", "/accidents");
  });
});
