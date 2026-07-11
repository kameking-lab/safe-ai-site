import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";

// useSearchParams を mock（client panel が参照する）
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("ChemicalRaPanel 入力欄のlabel関連付け（WCAG 1.3.1 / 4.1.2）", () => {
  it("一窓検索（UnifiedChemicalSearch）のlabelがinputを取得できる", () => {
    render(<ChemicalRaPanel />);
    expect(screen.getByLabelText(/物質名・CAS番号・製品名を入力/)).toBeInstanceOf(HTMLInputElement);
  });

  it("入力窓（テキスト検索窓）はパネル内に1つだけ（一窓化の合格基準）", () => {
    const { container } = render(<ChemicalRaPanel />);
    const textInputs = container.querySelectorAll('input[type="text"]');
    expect(textInputs.length).toBe(1);
  });

  it("作業内容（TextareaWithVoice）は物質入力後に表示されlabelで取得できる", () => {
    render(<ChemicalRaPanel />);
    fireEvent.change(screen.getByLabelText(/物質名・CAS番号・製品名を入力/), {
      target: { value: "トルエン" },
    });
    expect(
      screen.getByLabelText("作業内容（任意）— より精度の高い保護具推奨のために入力"),
    ).toBeInstanceOf(HTMLTextAreaElement);
  });
});
