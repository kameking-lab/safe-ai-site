import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { HomeThreePillars } from "./home-three-pillars";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";
import type { WarningEntry } from "@/lib/home-three-pillars-data";

const fatal: AccidentCase = {
  id: "a1",
  title: "テスト死亡事故",
  occurredOn: "2026-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "テスト概要 出典:https://example.com/press",
  mainCauses: ["足場未設置"],
  preventionPoints: ["安全帯の使用"],
  source: { site: "テスト出典", url: "https://example.com/press" },
};

const warnings: WarningEntry[] = [
  { iso: "JP-13", prefecture: "東京都", level: "warning", headline: "大雨警報" },
];

const revisions: LawRevisionCore[] = [
  {
    id: "r1",
    title: "テスト法改正",
    publishedAt: "2026-01-01",
    revisionNumber: "1",
    category: "労働安全衛生法",
    kind: "law",
    issuer: "厚生労働省",
    summary: "テスト概要",
  },
];

function renderPillars() {
  return render(
    <LanguageProvider>
      <HomeThreePillars fatal={fatal} lawRevisions={revisions} warnings={warnings} />
    </LanguageProvider>,
  );
}

describe("トップ HomeThreePillars（柱0 44px）", () => {
  it("出典・報道URLを開くリンクが min-h-[44px] を持つ", () => {
    renderPillars();
    const link = screen.getByText("出典・報道URLを開く").closest("a");
    expect(link?.className).toContain("min-h-[44px]");
  });

  it("10年事故DB一覧へのリンクが min-h-[44px] を持つ", () => {
    renderPillars();
    const link = screen.getByText("10年事故DB一覧へ →").closest("a");
    expect(link?.className).toContain("min-h-[44px]");
  });

  it("AlertGeneratorの「注意喚起文を作成」ボタンが min-h-[44px] を持つ（各柱に1つずつ）", () => {
    renderPillars();
    const buttons = screen.getAllByRole("button", { name: "注意喚起文を作成" });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.className).toContain("min-h-[44px]");
    }
  });
});
