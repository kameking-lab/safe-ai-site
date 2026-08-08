import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("ChemicalRaPanel 入力欄のlabel関連付け（WCAG 1.3.1 / 4.1.2）", () => {
  it("一窓検索（UnifiedChemicalSearch）のlabelがinputを取得できる", () => {
    renderPanel();
    expect(screen.getByLabelText(/物質名・CAS番号・SDS記載名/)).toBeInstanceOf(HTMLInputElement);
  });

  it("入力窓（テキスト検索窓）はパネル内に1つだけ（一窓化の合格基準）", () => {
    const { container } = renderPanel();
    const textInputs = container.querySelectorAll('input[type="text"]');
    expect(textInputs.length).toBe(1);
  });

  it("作業条件へ進むと作業内容（TextareaWithVoice）がlabelで取得できる", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/物質名・CAS番号・SDS記載名/), {
      target: { value: "トルエン" },
    });
    fireEvent.click(screen.getByRole("button", { name: "作業条件へ進む" }));
    expect(
      screen.getByLabelText("作業内容（任意）— 最新SDS・公式ツール確認用のメモ"),
    ).toBeInstanceOf(HTMLTextAreaElement);
  });
});
