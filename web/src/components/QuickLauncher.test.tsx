import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickLauncher } from "./QuickLauncher";

describe("QuickLauncher", () => {
  it("熱中症WBGTショートカットは実在するWBGT計算機ハブへリンクする（/educationへの誤配線を回帰防止）", () => {
    render(<QuickLauncher />);
    const link = screen.getByRole("link", { name: /熱中症WBGT/ });
    expect(link.getAttribute("href")).toBe("/heat-illness-prevention");
  });

  it("フルハーネスショートカットは実在する特別教育ページへリンクする（汎用/educationハブへの誤配線を回帰防止）", () => {
    render(<QuickLauncher />);
    const link = screen.getByRole("link", { name: /フルハーネス/ });
    expect(link.getAttribute("href")).toBe("/education/tokubetsu/fullharness");
  });

  it("ショートカットのリンク先はそれぞれ一意である（重複配線の回帰防止）", () => {
    render(<QuickLauncher />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((el) => el.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
