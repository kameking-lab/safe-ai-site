import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("グローバル 404 ページ (not-found)", () => {
  it("サイト内横断検索フォームが /search へ GET 送信する (柱C-2)", () => {
    const { container } = render(<NotFound />);
    const form = container.querySelector("form[role='search']");
    expect(form, "検索フォームが存在しない").toBeTruthy();
    expect(form?.getAttribute("action")).toBe("/search");
    expect((form?.getAttribute("method") ?? "").toLowerCase()).toBe("get");
    // /search が読む searchParam 名は q（SearchResults の useSearchParams.get('q')）。
    const input = form?.querySelector("input[name='q']");
    expect(input, "name=q の検索入力が存在しない").toBeTruthy();
  });

  it("検索入力にラベルが紐づく (アクセシビリティ)", () => {
    render(<NotFound />);
    expect(screen.getByLabelText("サイト内を検索")).toBeTruthy();
  });

  it("検索ボタンとフォーム要素が 44px 以上のタップ標的 (min-h-11)", () => {
    const { container } = render(<NotFound />);
    const input = container.querySelector("input[name='q']");
    const button = container.querySelector("button[type='submit']");
    expect(input?.className).toContain("min-h-11");
    expect(button?.className).toContain("min-h-11");
  });

  it("主要機能ランチャーが実在ページへ誘導する", () => {
    render(<NotFound />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const href of ["/", "/laws", "/accidents", "/court-cases", "/circulars", "/ky", "/e-learning", "/chatbot", "/contact"]) {
      expect(hrefs, `${href} へのリンクが無い`).toContain(href);
    }
  });

  it("noindex,nofollow（薄い 404 をインデックスさせない）", async () => {
    const { metadata } = await import("./not-found");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
