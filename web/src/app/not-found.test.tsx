import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("グローバル 404 ページ (not-found)", () => {
  it("主要ランドマークを1件だけ持つ", () => {
    render(<NotFound />);
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
  });

  it("検索語をURLへ送らず /search の入力画面へ案内する", () => {
    render(<NotFound />);
    const searchLink = screen.getByRole("link", { name: "サイト内を検索" });
    expect(searchLink.getAttribute("href")).toBe("/search");
    expect(document.querySelector("form[role='search']")).toBeNull();
    expect(document.querySelector("input[name='q']")).toBeNull();
  });

  it("検索導線の名前を支援技術から取得できる", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "サイト内を検索" })).toBeTruthy();
  });

  it("検索リンクが 44px 以上のタップ標的 (min-h-11)", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "サイト内を検索" }).className).toContain("min-h-11");
  });

  it("主要機能ランチャーが実在ページへ誘導する", () => {
    render(<NotFound />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const href of ["/", "/risk", "/laws", "/accident-news", "/circulars", "/ky/paper", "/chemical-ra", "/chatbot", "/contact"]) {
      expect(hrefs, `${href} へのリンクが無い`).toContain(href);
    }
    expect(hrefs).not.toContain("/court-cases");
    expect(hrefs).not.toContain("/e-learning");
  });

  it("noindex,nofollow（薄い 404 をインデックスさせない）", async () => {
    const { metadata } = await import("./not-found");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates).toMatchObject({ canonical: null });
  });

  it("404本文はindex可能なJSON-LDを出力しない", () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
