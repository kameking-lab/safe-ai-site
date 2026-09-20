import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfficialAccidentFlash } from "./official-accident-flash";

describe("OfficialAccidentFlash", () => {
  it("shows the latest official nationwide snapshot with its precise period", () => {
    render(<OfficialAccidentFlash />);

    expect(screen.getByRole("heading", { name: /令和8年8月速報/ })).toBeTruthy();
    expect(screen.getByText(/2026年1月1日〜7月31日に発生/)).toBeTruthy();
    expect(screen.getByText("301", { exact: false })).toBeTruthy();
    expect(screen.getByText("67,966", { exact: false })).toBeTruthy();
    expect(screen.getByText(/前年同期比 -62人/)).toBeTruthy();
  });

  it("links directly to both the source PDF and the rolling official page", () => {
    render(<OfficialAccidentFlash />);

    expect(screen.getByRole("link", { name: /8月速報PDFで検算/ }).getAttribute("href"))
      .toMatch(/\/dl\/26-08\.pdf$/);
    expect(screen.getByRole("link", { name: /厚労省の最新月を確認/ }).getAttribute("href"))
      .toMatch(/rousai-hassei\/$/);
  });
});
