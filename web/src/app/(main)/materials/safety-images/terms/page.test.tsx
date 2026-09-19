import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafetyImageTermsPage, { metadata } from "./page";

describe("安全画像の利用条件", () => {
  it("ブランド名を重複させないtitleとnoindex条件を持つ", () => {
    expect(metadata.title).toBe("安全画像の利用条件");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("翻訳確認の範囲を誇張せず画面へ明記する", () => {
    render(<SafetyImageTermsPage />);
    expect(screen.getByText(/5言語500文言/u).textContent).toContain("公式確認は24文言（日本語4、外国語20）");
    expect(screen.getByText(/5言語500文言/u).textContent).toContain("残る外国語文言");
    expect(screen.getByText(/5言語500文言/u).textContent).toContain("ネイティブ確認済みとは表示しません");
  });
});
