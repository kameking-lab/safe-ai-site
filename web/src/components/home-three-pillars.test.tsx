import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomeThreePillars } from "./home-three-pillars";
import type { AccidentCase } from "@/lib/types/domain";

const fatal: AccidentCase = {
  id: "a1",
  title: "足場からの墜落死亡事故",
  occurredOn: "2026-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "出典: example.com/report",
  mainCauses: ["安全帯未使用"],
  preventionPoints: ["安全帯の着用徹底"],
  source: { site: "職場のあんぜんサイト", url: "https://example.com/report" },
};

// 柱0: トップの死亡事故パネルは初訪の一人親方が最初にタップする導線。
// AlertGenerator送信ボタン・関連リンク・出典リンク・エラー時の再試行/連絡導線が
// 44px 未満だった既存欠陥の回帰ガード。
describe("HomeThreePillars 柱0 44pxタップ標的", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("「10年事故DB一覧へ」リンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} warnings={[]} />);
    const link = screen.getByRole("link", { name: /10年事故DB一覧へ/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("出典・報道URLを開くリンクが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} warnings={[]} />);
    const link = screen.getByRole("link", { name: /出典・報道URLを開く/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("AlertGeneratorの「注意喚起文を作成」送信ボタンが min-h-[44px]", () => {
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} warnings={[]} />);
    const button = screen.getByRole("button", { name: /注意喚起文を作成/ });
    expect(button.className).toContain("min-h-[44px]");
  });

  it("生成失敗時の再試行ボタンが min-h-[44px]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} warnings={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /注意喚起文を作成/ }));
    const retry = await waitFor(() => screen.getByRole("button", { name: /再試行/ }));
    expect(retry.className).toContain("min-h-[44px]");
  });

  it("3回連続失敗時の「管理者に連絡」リンクが min-h-[44px]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    render(<HomeThreePillars fatal={fatal} lawRevisions={[]} warnings={[]} />);
    const generateButton = screen.getByRole("button", { name: /注意喚起文を作成/ });
    fireEvent.click(generateButton);
    await waitFor(() => screen.getByRole("button", { name: /再試行/ }));
    fireEvent.click(screen.getByRole("button", { name: /再試行/ }));
    await waitFor(() => screen.getByRole("button", { name: /再試行/ }));
    fireEvent.click(screen.getByRole("button", { name: /再試行/ }));
    const contactLink = await waitFor(() => screen.getByRole("link", { name: /管理者に連絡/ }));
    expect(contactLink.className).toContain("min-h-[44px]");
  });
});
