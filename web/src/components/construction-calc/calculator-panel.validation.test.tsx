import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalculatorPanel } from "./calculator-panel";

describe("legacy calculator invalid input", () => {
  it("removes fallback results, explanation and print surfaces until the input is valid", () => {
    const { container } = render(<CalculatorPanel slug="slope-ratio-convert" />);
    const input = container.querySelector<HTMLInputElement>("#calc-field-angleDeg")!;
    fireEvent.change(container.querySelector("#calc-field-from")!, { target: { value: "angle" } });
    expect(screen.getByRole("button", { name: "計算書を出力（PDF/印刷）" })).toBeTruthy();
    fireEvent.change(input, { target: { value: "0" } });
    expect(screen.getByRole("list", { name: "入力の注意" })).toBeTruthy();
    expect(screen.queryByRole("status", { name: /計算結果:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "計算書を出力（PDF/印刷）" })).toBeNull();
    expect(screen.queryByRole("button", { name: "計算結果と式を文章で表示" })).toBeNull();
    expect(container.querySelector('[class="hidden print:block"]')?.textContent).toBe("");
    fireEvent.change(input, { target: { value: "45" } });
    expect(screen.getByRole("status", { name: /計算結果:/ })).toBeTruthy();
  });
});
