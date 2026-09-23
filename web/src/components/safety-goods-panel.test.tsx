import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SafetyGoodsPanel } from "./safety-goods-panel";

describe("SafetyGoodsPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/goods");
  });

  it("冒頭に選定ウィザードとNETIS案内を置き、旧来の大きな警告を出さない", () => {
    render(<SafetyGoodsPanel />);

    expect(screen.getByRole("heading", { name: "3つ選んで保護具候補を見る" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "用品カテゴリから実商品を探す" })).toBeDefined();
    expect(screen.queryByText("ほかの安全用品から探す")).toBeNull();
    expect(screen.getByRole("heading", { name: "安全課題から新技術を探す" })).toBeDefined();
    expect(screen.queryByText("この一覧だけで保護具を選定しないでください")).toBeNull();
    expect(screen.getByText(/検索結果は推奨や適合証明ではありません/)).toBeDefined();
  });

  it("実商品データ未設定時は写真や星評価を捏造しない", async () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "not_configured", items: [], checkedAt: null }),
    }));
    render(<SafetyGoodsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "保護帽" }));
    expect(await screen.findByText(/実商品写真・購入者評価は現在表示できません/u)).toBeDefined();
    expect(screen.queryByText(/★4\.\d \(/u)).toBeNull();
  });
});
