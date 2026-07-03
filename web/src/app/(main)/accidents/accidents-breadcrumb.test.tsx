import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import AccidentsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/accidents",
  useSearchParams: () => ({ get: () => null }),
}));

// 柱0: /accidents はホーム直下のハブだが可視パンくずが皆無で、他のハブ系
// ページ（/features・/court-cases 等）と体裁が揃っていなかった既存欠陥を是正。
// 現在地表示の回帰ガード。

describe("/accidents 可視パンくず", () => {
  it("「事故データベース」の現在地パンくずを表示する", () => {
    render(
      <LanguageProvider>
        <FuriganaProvider>
          <EasyJapaneseProvider>
            <AccidentsPage />
          </EasyJapaneseProvider>
        </FuriganaProvider>
      </LanguageProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "パンくずリスト" });
    expect(nav.textContent).toContain("事故データベース");
  });
});
