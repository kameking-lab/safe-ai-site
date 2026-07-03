import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrintFeaturesClient } from "./print-features-client";

describe("/features/print 柱0 44pxタップ標的", () => {
  it("印刷ボタンと通常表示に戻るリンクが min-h-[44px] を満たす", () => {
    render(<PrintFeaturesClient />);
    expect(screen.getByRole("button", { name: /印刷する/ }).className).toContain("min-h-[44px]");
    expect(screen.getByRole("link", { name: "通常表示に戻る" }).className).toContain(
      "min-h-[44px]",
    );
  });
});
