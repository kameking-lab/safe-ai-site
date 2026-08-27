import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafetySeminarTermsPage, { metadata } from "./page";

describe("/training/safety-seminars/terms", () => {
  it("既存レイアウトのmain内へmainを重複させず、利用境界を表示する", () => {
    const { container } = render(<SafetySeminarTermsPage />);
    expect(container.querySelector("main")).toBeNull();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "安全研修ライブラリの利用条件・注意事項",
      }),
    ).toBeTruthy();
    expect(container.textContent).toContain("法定の特別教育等を代替するものではありません");
  });

  it("noindex,followとself canonicalを維持する", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "https://www.anzen-ai-portal.jp/training/safety-seminars/terms",
    );
  });
});
