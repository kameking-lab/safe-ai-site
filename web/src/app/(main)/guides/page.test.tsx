import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import GuidesHubPage, { metadata } from "./page";
import { KEYWORD_LANDINGS } from "@/data/seo/keyword-landing";
import {
  PUBLIC_PRACTICAL_SAFETY_ASSETS,
  QUARANTINED_PRACTICAL_SAFETY_ASSETS,
} from "@/data/practical-safety-assets";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

const PUBLIC_KEYWORD_LANDINGS = KEYWORD_LANDINGS.filter((landing) =>
  isPublicRouteAvailable(`/guides/${landing.slug}`),
);
const QUARANTINED_KEYWORD_LANDINGS = KEYWORD_LANDINGS.filter(
  (landing) => !isPublicRouteAvailable(`/guides/${landing.slug}`),
);

describe("/guides ハブ（柱0 アイコンファースト）", () => {
  it("ページ見出しを描画", async () => {
    render(await GuidesHubPage());
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "検索意図別 機能解説ガイド",
      }),
    ).toBeDefined();
    expect(metadata.alternates?.canonical).toBe("/guides");
  });

  it("公開可能な4ガイドだけをカードとJSON-LDへ出し、隔離ガイドを露出しない", async () => {
    const { container } = render(await GuidesHubPage());
    expect(PUBLIC_KEYWORD_LANDINGS).toHaveLength(4);
    expect(QUARANTINED_KEYWORD_LANDINGS.length).toBeGreaterThan(0);

    for (const k of PUBLIC_KEYWORD_LANDINGS) {
      const link = document.querySelector(`a[href="/guides/${k.slug}"]`);
      expect(link, `/guides/${k.slug} のカードリンクが無い`).toBeTruthy();
    }
    for (const k of QUARANTINED_KEYWORD_LANDINGS) {
      expect(
        document.querySelector(`a[href="/guides/${k.slug}"]`),
        `/guides/${k.slug} は隔離対象なのにリンクされている`,
      ).toBeNull();
    }

    const jsonLd = Array.from(
      container.querySelectorAll<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      ),
    )
      .map((script) => script.textContent ?? "")
      .join("\n");
    for (const k of PUBLIC_KEYWORD_LANDINGS) {
      expect(jsonLd).toContain(`/guides/${k.slug}`);
    }
    for (const k of QUARANTINED_KEYWORD_LANDINGS) {
      expect(jsonLd).not.toContain(`/guides/${k.slug}`);
    }
  });

  it("各ガイドカードが3秒で見分けるためのアイコンを1つ持つ", async () => {
    render(await GuidesHubPage());
    for (const k of PUBLIC_KEYWORD_LANDINGS) {
      const link = document.querySelector(`a[href="/guides/${k.slug}"]`);
      // アイコンバッジ(svg) + 末尾「ガイドを読む →」の矢印svg = 2つ。
      // 先頭のアイコンバッジが存在することを確認する。
      const badge = link?.querySelector("span.rounded-xl > svg");
      expect(badge, `/guides/${k.slug} のアイコンバッジが無い`).toBeTruthy();
    }
  });

  it("公開4ガイドのアイコン色は重複せず視覚的に弁別できる", async () => {
    render(await GuidesHubPage());
    const badgeClasses = PUBLIC_KEYWORD_LANDINGS.map((k) => {
      const link = document.querySelector(`a[href="/guides/${k.slug}"]`);
      const badge = link?.querySelector("span.rounded-xl");
      return badge?.className ?? "";
    });
    const colorTokens = badgeClasses.map((c) =>
      (c.match(/bg-[a-z]+-\d+/)?.[0] ?? "").trim(),
    );
    expect(colorTokens.every((t) => t.length > 0)).toBe(true);
    expect(new Set(colorTokens).size).toBe(PUBLIC_KEYWORD_LANDINGS.length);
  });

  it("実務資産は公開可能な正規HTMLだけを44px導線で出し、提供状態を文字でも示す", async () => {
    render(await GuidesHubPage());
    expect(screen.getByRole("heading", { name: "実務資産ナビ" })).toBeDefined();
    expect(screen.getByText("HTMLを利用の正本とします")).toBeDefined();

    for (const item of PUBLIC_PRACTICAL_SAFETY_ASSETS) {
      const heading = screen.getByRole("heading", {
        level: 4,
        name: item.title,
      });
      const card = heading.closest("li");
      expect(card, `${item.title}のカードがない`).toBeTruthy();
      const link = within(card!).getByRole("link", { name: "HTMLで開く" });
      expect(link.getAttribute("href")).toBe(item.href);
      expect(link.className).toContain("min-h-11");
    }

    for (const item of QUARANTINED_PRACTICAL_SAFETY_ASSETS) {
      expect(
        screen.queryByRole("heading", { level: 4, name: item.title }),
      ).toBeNull();
    }

    const status = screen.getByRole("status");
    expect(status.textContent).toContain(
      `${QUARANTINED_PRACTICAL_SAFETY_ASSETS.length}件`,
    );
    expect(status.textContent).toContain("公開一覧から除外");
    expect(screen.getAllByText(/提供中/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/一部対応/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/未整備/).length).toBeGreaterThan(0);
  });

  it("PF-054: 新入社員向けqueryを専用の4項目入口として反映する", async () => {
    render(
      await GuidesHubPage({
        searchParams: Promise.resolve({ audience: "new-worker" }),
      }),
    );
    expect(
      screen.getByRole("heading", { name: "最初に確認する4項目" }),
    ).toBeDefined();
    expect(screen.getByText("新入社員・作業員向け")).toBeDefined();
    expect(
      screen.getByRole("link", { name: /緊急時対応/ }),
    ).toBeDefined();
  });
});
