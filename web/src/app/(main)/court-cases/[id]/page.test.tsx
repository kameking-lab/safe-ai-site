import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import CourtCaseDetailPage from "./page";
import { COURT_CASES } from "@/data/court-cases";

// 判例詳細は async サーバーコンポーネント。await して得た JSX を描画して検証する。
const id = COURT_CASES[0].id;

describe("/court-cases/[id] 柱0 44pxタップ標的", () => {
  it("最上部の「労災裁判例コーナーに戻る」戻りリンクが 44px タップ標的を満たす", async () => {
    render(await CourtCaseDetailPage({ params: Promise.resolve({ id }) }));
    const back = screen.getByRole("link", { name: /労災裁判例コーナーに戻る/ });
    expect(back.className).toContain("min-h-[44px]");
    expect(back.className).toContain("items-center");
  });

  it("最上部の「この判例を印刷／PDF」リンクが 44px タップ標的を満たす", async () => {
    render(await CourtCaseDetailPage({ params: Promise.resolve({ id }) }));
    const print = screen.getByRole("link", { name: /この判例を印刷／PDF/ });
    expect(print.className).toContain("min-h-[44px]");
    expect(print.className).toContain("items-center");
  });

  it("現場の実務へつなげる3カード（KY用紙・重大災害事例・安衛法質問）が 44px タップ標的を満たす", async () => {
    render(await CourtCaseDetailPage({ params: Promise.resolve({ id }) }));
    for (const name of [/KY用紙で危険予知/, /重大災害事例を見る/, /安衛法を質問する/]) {
      const card = screen.getByRole("link", { name });
      expect(card.className).toContain("min-h-[44px]");
      expect(card.className).toContain("items-center");
    }
  });
});
