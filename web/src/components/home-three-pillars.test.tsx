import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { HomeThreePillars } from "./home-three-pillars";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";
import type { WarningEntry } from "@/lib/home-three-pillars-data";

const FATAL: AccidentCase = {
  id: "test-fatal-1",
  title: "テスト用死亡事故事例",
  occurredOn: "2026-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "テスト用の概要文。",
  mainCauses: ["安全帯未使用"],
  preventionPoints: ["安全帯の着用徹底"],
};

const LAW_REVISIONS: LawRevisionCore[] = [
  {
    id: "test-law-1",
    title: "テスト用法改正",
    publishedAt: "2026-01-01",
    revisionNumber: "1",
    category: "労働安全衛生法",
    kind: "law",
    issuer: "厚生労働省",
    summary: "テスト用の概要。",
  },
];

const WARNINGS: WarningEntry[] = [];

function renderPillars() {
  return render(
    <LanguageProvider>
      <HomeThreePillars fatal={FATAL} lawRevisions={LAW_REVISIONS} warnings={WARNINGS} />
    </LanguageProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// 柱0: トップの本日の安全トピック3枠は初訪ユーザーが最初に触る領域。
// AIアラート生成ボタン・関連リンクが44px未満へ退行しないことを保証する。
describe("home-three-pillars のタップ標的44px化", () => {
  it("死亡事故カード: 『10年事故DB一覧へ』リンクが min-h-[44px]", () => {
    renderPillars();
    const dbLink = screen.getByRole("link", { name: /10年事故DB一覧へ/ });
    expect(dbLink.className).toContain("min-h-[44px]");
  });

  it("AlertGenerator: 『注意喚起文を作成』ボタンが全て min-h-[44px]", () => {
    renderPillars();
    const generateButtons = screen.getAllByRole("button", { name: /注意喚起文を作成/ });
    expect(generateButtons.length).toBeGreaterThan(0);
    for (const button of generateButtons) {
      expect(button.className).toContain("min-h-[44px]");
    }
  });

  it("AlertGenerator失敗時: 再試行ボタンと管理者連絡リンクが min-h-[44px]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "生成に失敗しました。" }),
      }),
    );
    renderPillars();
    // 死亡事故カード（1件目）のAlertGeneratorで再試行フローを検証する
    const generateButton = screen.getAllByRole("button", { name: /注意喚起文を作成/ })[0];

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(generateButton);
      await waitFor(() => {
        expect(screen.getAllByText("生成に失敗しました。").length).toBeGreaterThan(0);
      });
    }

    const retryButton = screen.getByRole("button", { name: /再試行/ });
    expect(retryButton.className).toContain("min-h-[44px]");

    const contactLink = screen.getByRole("link", { name: /管理者に連絡/ });
    expect(contactLink.className).toContain("min-h-[44px]");
  });
});
