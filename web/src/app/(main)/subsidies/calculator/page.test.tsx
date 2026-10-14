import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";
describe("研修の参考試算", () => {
  it("確認前は計算できず、計算後に条件を変えると古い結果を消す", () => {
    render(<Page />);
    const calculate = screen.getByRole("button", { name: "1人分の参考額を計算する" });
    expect((calculate as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(calculate);
    expect(screen.getByText("経費助成 75,000円")).toBeDefined();
    expect(screen.queryByText(/申請対象の助成金が見つかりました/)).toBeNull();
    fireEvent.change(screen.getByLabelText("訓練方法"), { target: { value: "elearning" } });
    expect(screen.queryByText("経費助成 75,000円")).toBeNull();
    fireEvent.change(screen.getByLabelText(/対象経費・1人分/), { target: { value: "1000000" } });
    fireEvent.click(calculate);
    expect(screen.getByText("経費助成 150,000円")).toBeDefined();
  });
});
