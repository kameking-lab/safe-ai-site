import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import WomenPage from "./page";

// 柱0: /diversity/women は他7本のD&Iサブページ(disability/elderly/…)がScaffoldPage経由で
// 3階層の可視パンくずを持つ中、唯一「戻る」単一リンクのみだった既存の不整合を是正。

describe("/diversity/women 可視パンくず", () => {
  it("多様性と安全→本ページの階層パンくずを表示する", () => {
    render(
      <LanguageProvider>
        <FuriganaProvider>
          <EasyJapaneseProvider>
            <WomenPage />
          </EasyJapaneseProvider>
        </FuriganaProvider>
      </LanguageProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "パンくずリスト" });
    expect(nav.textContent).toContain("多様性と安全");
    expect(nav.textContent).toContain("女性向け PPE・妊産婦就業ガイド");
    const link = within(nav).getByRole("link", { name: "多様性と安全" });
    expect(link.getAttribute("href")).toBe("/diversity");
  });
});
