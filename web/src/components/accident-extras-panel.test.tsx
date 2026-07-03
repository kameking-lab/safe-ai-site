import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AccidentExtrasPanel } from "./accident-extras-panel";
import type { CompanyProfile } from "@/lib/company-profile";
import type { ScoredMhlwCase } from "@/lib/mhlw-similar-cases";

vi.mock("@/lib/mhlw-similar-cases", () => ({
  searchMhlwSimilarStrict: vi.fn(
    async (): Promise<{ cases: ScoredMhlwCase[]; mode: "strict" | "loose" | "none" }> => ({
      cases: [
        {
          id: "mhlw-1",
          year: 2024,
          month: 3,
          description: "足場からの墜落災害",
          industry: "建設業",
          industryMedium: null,
          cause: null,
          type: "墜落・転落",
          workplaceSize: null,
          occurrenceTime: null,
          score: 40,
          matchedTokens: ["建設"],
        },
      ],
      mode: "strict",
    })
  ),
  getMhlwDeathsTotal: vi.fn(async () => 123),
}));

vi.mock("@/data/mock/accident-cases", () => ({
  getAccidentCasesDataset: () => [],
}));

const PROFILE: CompanyProfile = {
  companyName: "テスト建設",
  industry: "construction",
  size: "10-50",
  chemicals: [],
  machines: [],
  sites: [],
  workKeywords: ["足場"],
  wizardCompleted: true,
  updatedAt: new Date(0).toISOString(),
};

afterEach(() => {
  window.localStorage.clear();
});

describe("AccidentExtrasPanel", () => {
  it("プロファイル未設定時「/profile を開く →」リンクが44pxタップ標的を満たす", async () => {
    render(<AccidentExtrasPanel />);
    const link = await screen.findByText("/profile を開く →");
    expect(link.className).toContain("min-h-[44px]");
  });

  it("プロファイル設定済み時「自社設定 →」と類似事例リンクが44pxタップ標的を満たす", async () => {
    window.localStorage.setItem("company-profile-v1", JSON.stringify(PROFILE));
    render(<AccidentExtrasPanel />);
    const settingsLink = await screen.findByText("自社設定 →");
    expect(settingsLink.className).toContain("min-h-[44px]");
    await waitFor(() => {
      const caseLink = screen.getByText(/事故DBで探す|事例の詳細を見る|事例を見る/);
      expect(caseLink.className).toContain("min-h-[44px]");
    });
  });
});
