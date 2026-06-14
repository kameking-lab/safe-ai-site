import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GuidesHubPage from "./page";
import { KEYWORD_LANDINGS } from "@/data/seo/keyword-landing";

describe("/guides ハブ（柱0 アイコンファースト）", () => {
  it("ページ見出しを描画", () => {
    render(<GuidesHubPage />);
    expect(screen.getByText("検索意図別 機能解説ガイド")).toBeDefined();
  });

  it("ガイド一覧の各カードが /guides/<slug> へリンクする", () => {
    render(<GuidesHubPage />);
    for (const k of KEYWORD_LANDINGS) {
      const link = document.querySelector(`a[href="/guides/${k.slug}"]`);
      expect(link, `/guides/${k.slug} のカードリンクが無い`).toBeTruthy();
    }
  });

  it("各ガイドカードが3秒で見分けるためのアイコンを1つ持つ", () => {
    render(<GuidesHubPage />);
    for (const k of KEYWORD_LANDINGS) {
      const link = document.querySelector(`a[href="/guides/${k.slug}"]`);
      // アイコンバッジ(svg) + 末尾「ガイドを読む →」の矢印svg = 2つ。
      // 先頭のアイコンバッジが存在することを確認する。
      const badge = link?.querySelector("span.rounded-xl > svg");
      expect(badge, `/guides/${k.slug} のアイコンバッジが無い`).toBeTruthy();
    }
  });

  it("4ガイドのアイコン色は重複せず視覚的に弁別できる", () => {
    render(<GuidesHubPage />);
    const badgeClasses = KEYWORD_LANDINGS.map((k) => {
      const link = document.querySelector(`a[href="/guides/${k.slug}"]`);
      const badge = link?.querySelector("span.rounded-xl");
      return badge?.className ?? "";
    });
    const colorTokens = badgeClasses.map((c) =>
      (c.match(/bg-[a-z]+-\d+/)?.[0] ?? "").trim(),
    );
    expect(colorTokens.every((t) => t.length > 0)).toBe(true);
    expect(new Set(colorTokens).size).toBe(KEYWORD_LANDINGS.length);
  });
});
