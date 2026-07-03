import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import IndustryLandingPage from "./page";

// 業種詳細ページは async サーバーコンポーネント。await して得た JSX を描画して検証する。
// construction は keyword href あり・chemicalSubstances 非空のため全パターンを網羅できる。

describe("/industries/[industry] 柱0 44pxタップ標的", () => {
  it("キーワードピル(href あり)が min-h-[44px] を持つ", async () => {
    render(await IndustryLandingPage({ params: Promise.resolve({ industry: "construction" }) }));
    const kw = screen.getByRole("link", { name: /#フルハーネス特別教育/ });
    expect(kw.className).toContain("min-h-[44px]");
  });

  it("副リンク6箇所(条文検索/法改正一覧/通達一覧/KY用紙/化学物質RA・DB/教育ファインダー)が min-h-[44px] を持つ", async () => {
    render(await IndustryLandingPage({ params: Promise.resolve({ industry: "construction" }) }));
    const names = [
      /条文検索を開く/,
      /法改正一覧/,
      /通達一覧をすべて見る/,
      /KY用紙作成ツールを開く/,
      /化学物質リスクアセスメント/,
      /化学物質データベース/,
      /特別教育・技能講習ファインダー/,
    ];
    for (const name of names) {
      const link = screen.getByRole("link", { name });
      expect(link.className).toContain("min-h-[44px]");
    }
  });
});
