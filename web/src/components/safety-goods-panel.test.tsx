import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafetyGoodsPanel } from "./safety-goods-panel";

describe("SafetyGoodsPanel", () => {
  it("冒頭に選定ウィザードとNETIS案内を置き、旧来の大きな警告を出さない", () => {
    render(<SafetyGoodsPanel />);

    expect(screen.getByRole("heading", { name: "3つ選んで保護具候補を見る" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "イラストから安全用品を選ぶ" })).toBeDefined();
    expect(screen.queryByText("ほかの安全用品から探す")).toBeNull();
    expect(screen.getByRole("heading", { name: "安全課題から新技術を探す" })).toBeDefined();
    expect(screen.queryByText("この一覧だけで保護具を選定しないでください")).toBeNull();
    expect(screen.getByText(/検索結果は推奨や適合証明ではありません/)).toBeDefined();
  });
});
