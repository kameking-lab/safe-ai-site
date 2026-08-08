import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfficialRecentLinks } from "./official-recent-links";

describe("OfficialRecentLinks", () => {
  it("公式データは結果を遮らない閉じた詳細へ集約する", () => {
    const { container } = render(<OfficialRecentLinks />);
    const details = container.querySelector("details");

    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(screen.getByText("公式の事故データ")).toBeDefined();
    expect(container.textContent).not.toContain("政府標準利用規約");
    expect(container.textContent).not.toContain("入力した検索語");
  });
});
