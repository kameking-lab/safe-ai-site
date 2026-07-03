import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import CourtCasesPrintPage from "./page";

// 印刷用ビューは async サーバーコンポーネント。await して得た JSX を描画して検証する。
describe("/court-cases/print 柱0 44pxタップ標的", () => {
  it("「労災裁判例コーナーに戻る」戻りリンクが 44px タップ標的を満たす", async () => {
    render(await CourtCasesPrintPage({ searchParams: Promise.resolve({}) }));
    const back = screen.getByRole("link", { name: /労災裁判例コーナーに戻る/ });
    expect(back.className).toContain("min-h-[44px]");
    expect(back.className).toContain("items-center");
  });

  it("この一覧を印刷 / PDF保存ボタンが 44px タップ標的を満たす", async () => {
    render(await CourtCasesPrintPage({ searchParams: Promise.resolve({}) }));
    const print = screen.getByRole("button", { name: /この一覧を印刷/ });
    expect(print.className).toContain("min-h-[44px]");
  });

  it("0件時の「コーナーに戻って絞り込みを見直す」リンクが 44px タップ標的を満たす", async () => {
    render(
      await CourtCasesPrintPage({
        searchParams: Promise.resolve({ q: "該当するはずのない検索語xyz123" }),
      })
    );
    const back = screen.getByRole("link", { name: /コーナーに戻って絞り込みを見直す/ });
    expect(back.className).toContain("min-h-[44px]");
    expect(back.className).toContain("items-center");
  });
});
