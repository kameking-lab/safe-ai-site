import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeTrustEntry } from "./home-trust-entry";

describe("HomeTrustEntry", () => {
  it("説明を繰り返さず品質と注意事項へ案内する", () => {
    const { container } = render(<HomeTrustEntry />);

    expect(container.querySelectorAll("ul > li")).toHaveLength(0);
    expect(screen.queryByText(/公式資料が正本|取得日時と状態|AIは判断/)).toBeNull();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: /品質と出典/ }).getAttribute("href")).toBe(
      "/about/quality",
    );
    expect(
      screen.getByRole("link", { name: /注意事項/ }).getAttribute("href"),
    ).toBe("/about/usage-notes");
  });
});
