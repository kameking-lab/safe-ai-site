import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MhlwChemicalSelector } from "./mhlw-chemical-selector";

/**
 * コンボボックスのキーボード操作（ArrowDown/Up・Enter・Escape）と
 * ARIA属性（role=combobox・aria-expanded・aria-activedescendant）の回帰ガード（2026-07-03）。
 */
describe("MhlwChemicalSelector のキーボード操作", () => {
  it("ArrowDownでハイライトし、Enterは確認画面へ送るだけで明示確認後に選択する", () => {
    const onSelect = vi.fn();
    render(<MhlwChemicalSelector value={null} onSelect={onSelect} />);

    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    fireEvent.change(input, { target: { value: "トルエン" } });
    expect(input.getAttribute("aria-expanded")).toBe("true");

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
    expect(options[0].getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "候補の同一性を確認してください" }),
    ).toBeDefined();
    expect(document.body.textContent).toContain("SDS記載名");
    expect(document.body.textContent).toContain("CAS番号");

    fireEvent.click(
      screen.getByRole("button", { name: "SDSと一致する候補を確定" }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("PF-007 曖昧なキシレンはEnterだけで先頭候補を暗黙確定しない", () => {
    const onSelect = vi.fn();
    render(<MhlwChemicalSelector value={null} onSelect={onSelect} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "キシレン" } });
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/製品固有の最新SDSと名称・CAS番号/)).toBeDefined();
    expect(document.body.textContent).toMatch(/異性体|混合物/);
  });

  it("Escapeで開いたリストを閉じる", () => {
    const onSelect = vi.fn();
    render(<MhlwChemicalSelector value={null} onSelect={onSelect} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "トルエン" } });
    expect(input.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("結果リストがrole=listbox、各項目がrole=optionを持つ", () => {
    render(<MhlwChemicalSelector value={null} onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "トルエン" } });

    expect(screen.getByRole("listbox")).not.toBeNull();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });
});
