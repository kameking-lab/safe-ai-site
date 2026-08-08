import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeAccidentContextBanner } from "./home-accident-context-banner";

describe("HomeAccidentContextBanner", () => {
  it("shows an unconfirmed context without claiming an approved prefill", () => {
    const { container } = render(
      <HomeAccidentContextBanner
        headline="工事現場で作業員が転落し死亡"
        accidentType="fall"
        workCategory="construction"
      />,
    );

    expect(screen.getByText("参照元：ホームの事故情報")).toBeTruthy();
    expect(screen.getByText("事故型：").parentElement?.textContent).toContain(
      "墜落・転落",
    );
    expect(screen.getByText("作業カテゴリ：").parentElement?.textContent).toContain(
      "建設業",
    );
    expect(container.textContent).toContain("候補として読み込みました");
    expect(container.textContent).toContain("現場条件を人が確認してください");
    expect(container.textContent).toContain("承認済みにもしていません");
  });
});
