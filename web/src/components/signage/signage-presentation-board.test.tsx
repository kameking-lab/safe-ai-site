import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignagePresentationBoard } from "./signage-presentation-board";

describe("SignagePresentationBoard", () => {
  it("1024 presentationへ状態・鮮度・WBGT・警報・朝礼・公式確認先を収める", () => {
    const onOpenSettings = vi.fn();
    const { container } = render(
      <SignagePresentationBoard
        regionLabel="東京都 新宿区"
        stateLabel="気象 確認不能"
        stateDetail="取得失敗のため作業可否を判断しません。"
        stateTone="caution"
        freshnessLabel="取得不能"
        freshnessDetail="気象庁で再確認してください。"
        freshnessTone="caution"
        warningLabel="警報の有無を確認不能"
        warningDetail="取得不能を警報なしとして扱いません。"
        warningTone="caution"
        morningPoints={["公式警報を確認", "報道見出しは未確認", "法改正の原文を確認"]}
        officialLinks={[
          { label: "気象庁", href: "https://www.jma.go.jp/bosai/warning/" },
          { label: "環境省WBGT", href: "https://www.wbgt.env.go.jp/" },
        ]}
        onOpenSettings={onOpenSettings}
      />,
    );

    const board = container.querySelector('[data-signage-presentation="1024"]');
    expect(board?.className).toContain("min-[1024px]:grid");
    expect(screen.queryByText("現場実測値を確認")).toBeNull();
    expect(screen.queryByText(/PRESENTATION MODE/)).toBeNull();
    expect(screen.getByText("取得不能を警報なしとして扱いません。")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("min-h-11");
    }
    screen.getByRole("button", { name: "設定・詳細" }).click();
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
