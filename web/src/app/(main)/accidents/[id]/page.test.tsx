import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AccidentDetailPage from "./page";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";

// 事故詳細は async サーバーコンポーネント。await して得た JSX を描画して検証する。
// 「類似する事故事例」セクションは similar.length > 0 の場合のみ描画されるため、
// 同じ type または workCategory を持つ事故が他に存在するものを選ぶ。
const all = getAccidentCasesDataset();
const target = all.find(
  (c) => all.filter((o) => o.id !== c.id && (o.type === c.type || o.workCategory === c.workCategory)).length > 0
)!;
const targetWithSourceUrl = all.find((c) => /^mhlw-\d+$/.test(c.id))!;

describe("/accidents/[id] 柱0 44pxタップ標的", () => {
  it("「事故DBに戻る →」リンクが 44px タップ標的を満たす", async () => {
    render(await AccidentDetailPage({ params: Promise.resolve({ id: target.id }) }));
    const back = screen.getByRole("link", { name: /事故DBに戻る/ });
    expect(back.className).toContain("min-h-[44px]");
    expect(back.className).toContain("items-center");
  });

  it("最上部パンくずの「事故データベース」リンクが 44px タップ標的を満たす", async () => {
    render(await AccidentDetailPage({ params: Promise.resolve({ id: target.id }) }));
    const crumb = screen.getByRole("link", { name: /事故データベース/ });
    expect(crumb.className).toContain("min-h-[44px]");
    expect(crumb.className).toContain("items-center");
  });

  it("類似する事故事例のタイトルリンクが 44px タップ標的を満たす", async () => {
    render(await AccidentDetailPage({ params: Promise.resolve({ id: target.id }) }));
    const heading = screen.getByRole("heading", { name: /類似する事故事例/ });
    const section = heading.closest("section")!;
    const titleLinks = section.querySelectorAll('a[href^="/accidents/"]');
    expect(titleLinks.length).toBeGreaterThan(0);
    for (const link of Array.from(titleLinks)) {
      if (link.textContent?.includes("事故DBに戻る")) continue;
      expect(link.className).toContain("min-h-[44px]");
      expect(link.className).toContain("items-center");
    }
  });

  it("「出典元を開く」外部リンクが 44px タップ標的を満たす", async () => {
    render(await AccidentDetailPage({ params: Promise.resolve({ id: targetWithSourceUrl.id }) }));
    const sourceLink = screen.getByRole("link", { name: /出典元を開く/ });
    expect(sourceLink.className).toContain("min-h-[44px]");
    expect(sourceLink.className).toContain("items-center");
  });
});
