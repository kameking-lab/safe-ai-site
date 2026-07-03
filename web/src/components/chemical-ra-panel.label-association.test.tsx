import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";

// useSearchParams を mock（client panel が参照する）
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("ChemicalRaPanel 入力欄のlabel関連付け（WCAG 1.3.1 / 4.1.2）", () => {
  it("① 厚労省物質選択（MhlwChemicalSelector）のlabelがinputを取得できる", () => {
    render(<ChemicalRaPanel />);
    expect(
      screen.getByLabelText(/厚労省.*物質から選ぶ/),
    ).toBeInstanceOf(HTMLInputElement);
  });

  it("② 物質名直接入力（InputWithVoice）のlabelがinputを取得できる", () => {
    render(<ChemicalRaPanel />);
    expect(
      screen.getByLabelText("② 物質名を直接入力（リストにない物質・俗称・英語名）"),
    ).toBeInstanceOf(HTMLInputElement);
  });

  it("作業内容（TextareaWithVoice）のlabelがtextareaを取得できる", () => {
    render(<ChemicalRaPanel />);
    expect(
      screen.getByLabelText("作業内容（任意）— より精度の高い保護具推奨のために入力"),
    ).toBeInstanceOf(HTMLTextAreaElement);
  });
});
