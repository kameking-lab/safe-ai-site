import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChemicalDatabaseClient } from "./chemical-database-client";

vi.mock("@/components/chemical/chemical-not-found-rescue", () => ({
  ChemicalNotFoundRescue: () => null,
}));

function selectTag(label: string) {
  fireEvent.click(screen.getAllByRole("button", { name: label })[0]!);
}

describe("化学DBの保存済み規制情報による絞り込み", () => {
  it.each([
    ["有機則 第二種", "108-88-3"],
    ["有機則 第一種", "75-15-0"],
    ["特化則 第二類", "71-43-2"],
  ])("%s で詳細ページのCAS別収載情報 %s を検索できる", (label, cas) => {
    render(<ChemicalDatabaseClient />);
    selectTag(label);

    const row = screen.getByRole("row", { name: new RegExp(cas) });
    expect(within(row).getByRole("button", { name: label })).toBeTruthy();
    expect(screen.queryByText("検索結果0件")).toBeNull();
  });

  it("AND/ORを保ち、0件を規制対象外の判定と表示しない", () => {
    render(<ChemicalDatabaseClient />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "108-88-3" } });
    selectTag("有機則 第二種");
    selectTag("PRTR第一種");
    expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();

    selectTag("特化則 第二類");
    expect(screen.queryByRole("row", { name: /108-88-3/ })).toBeNull();
    expect(screen.getByText("検索結果0件")).toBeTruthy();
    expect(screen.getByText(/規制対象外の判定ではありません/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "いずれか (OR)" }));
    expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "クリア" }));
    expect(screen.getByRole("row", { name: /108-88-3/ })).toBeTruthy();
  });

  it("有機則のCAS別情報がない物質へタグを推測付与しない", () => {
    render(<ChemicalDatabaseClient />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "1310-73-2" } });
    selectTag("有機則 第二種");

    expect(screen.queryByRole("row", { name: /1310-73-2/ })).toBeNull();
    expect(screen.getByText(/規制対象外の判定ではありません/)).toBeTruthy();
  });
});
