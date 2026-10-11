import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfficialAccidentFlash } from "./official-accident-flash";

describe("OfficialAccidentFlash", () => {
  it("shows the latest official nationwide snapshot with its precise period", () => {
    render(<OfficialAccidentFlash />);

    expect(screen.getByRole("heading", { name: /令和8年9月速報/ })).toBeTruthy();
    expect(screen.getByText(/2026年1月1日〜8月31日に発生/)).toBeTruthy();
    expect(screen.getByText("365", { exact: false })).toBeTruthy();
    expect(screen.getByText("79,954", { exact: false })).toBeTruthy();
    expect(screen.getByText(/前年同期比 -55人/)).toBeTruthy();
  });

  it("links directly to both the source PDF and the rolling official page", () => {
    render(<OfficialAccidentFlash />);

    expect(screen.getByRole("link", { name: /2026年9月速報PDFで検算/ }).getAttribute("href"))
      .toMatch(/\/dl\/26-09\.pdf$/);
    expect(screen.getByRole("link", { name: /厚労省の最新月を確認/ }).getAttribute("href"))
      .toMatch(/rousai-hassei\/$/);
  });
});
