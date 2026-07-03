import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ChemicalRaExtras } from "./chemical-ra-extras";

describe("ChemicalRaExtras", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds an item and persists it via localStorage", () => {
    render(<ChemicalRaExtras />);
    fireEvent.change(screen.getByPlaceholderText("物質名"), { target: { value: "トルエン" } });
    fireEvent.click(screen.getByRole("button", { name: /追加/ }));

    expect(screen.getByText("トルエン")).not.toBeNull();
    expect(window.localStorage.getItem("chemical-ra:site-list-v1")).toContain("トルエン");
  });

  it("keeps the added item visible even if localStorage.setItem throws for this list's key (private browsing/quota exceeded)", () => {
    // 他キー（company-profile等・他機能所有）は実装どおり書き込ませ、
    // このコンポーネント固有キーのみ失敗させて影響範囲を厳密に限定する。
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation((key, value) => {
        if (key === "chemical-ra:site-list-v1") {
          throw new Error("QuotaExceededError");
        }
        originalSetItem(key, value);
      });

    render(<ChemicalRaExtras />);
    expect(() => {
      fireEvent.change(screen.getByPlaceholderText("物質名"), { target: { value: "キシレン" } });
      fireEvent.click(screen.getByRole("button", { name: /追加/ }));
    }).not.toThrow();

    // 保存は失敗しているが、UI上は追加操作自体はクラッシュせず完了する
    expect(screen.getByText("キシレン")).not.toBeNull();
    setItemSpy.mockRestore();
  });
});
