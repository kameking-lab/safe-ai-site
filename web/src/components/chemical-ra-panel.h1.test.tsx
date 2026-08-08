import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";
import { TransientQueryBridgeProvider } from "./home-safety-cockpit/transient-query-bridge";

function renderPanel() {
  return render(
    <TransientQueryBridgeProvider>
      <ChemicalRaPanel />
    </TransientQueryBridgeProvider>,
  );
}

// useSearchParams を mock（client panel が参照する）
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("ChemicalRaPanel 見出し階層（多重h1の是正）", () => {
  it("パネルは h1 を持たない（ページ側 PageHeader が唯一の h1）", () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll("h1").length).toBe(0);
  });

  it("通常時は説明カードより検索入力を先に示す", () => {
    const { container } = renderPanel();
    expect(screen.getByRole("combobox", { name: /物質名・CAS番号・SDS記載名/ })).toBeTruthy();
    expect(container.querySelectorAll("[data-warning-card]")).toHaveLength(0);
    expect(screen.queryByText(/曖昧な物質は自動確定しません/)).toBeNull();
  });

  it("初期候補を3件に絞り、作業条件を主操作から開く", () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll("[data-chemical-quick-substance='true']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-primary-action='true']")).toHaveLength(1);
    expect(container.querySelector("#chemical-ra-work-conditions")).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: /物質名・CAS番号・SDS記載名/ }), {
      target: { value: "トルエン" },
    });
    fireEvent.click(screen.getByRole("button", { name: "作業条件へ進む" }));

    expect(container.querySelector("#chemical-ra-work-conditions")).toBeTruthy();
    expect(screen.getByRole("button", { name: "公的情報を確認" })).toBeTruthy();
  });
});
