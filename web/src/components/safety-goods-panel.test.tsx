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
    expect(screen.getByRole("heading", { name: "まず、必要な特徴を選ぶ" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /墜落時の頭部保護/u }));
    expect(await screen.findByText(/商品データの接続準備中です/u)).toBeDefined();
    expect(screen.queryByText(/★4\.\d \(/u)).toBeNull();
  });

  it("身体用保護具を先に示し、補助用品と別名検索でも目的のカテゴリへ進める", () => {
    render(<SafetyGoodsPanel />);
    expect(screen.getByRole("button", { name: "保護帽" })).toBeDefined();
    expect(screen.getByRole("button", { name: "化学防護服" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "ガス検知器・酸素濃度計" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /現場の補助用品/u }));
    expect(screen.getByRole("button", { name: "ガス検知器・酸素濃度計" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "保護帽" })).toBeNull();

    fireEvent.change(screen.getByRole("searchbox", { name: "用品名・作業から探す" }), { target: { value: "防塵" } });
    expect(screen.getByRole("button", { name: "呼吸用保護具" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "ガス検知器・酸素濃度計" })).toBeNull();
  });

  it("補助用品の直リンクから一覧に戻っても元の分類を表示する", () => {
    window.history.replaceState(null, "", "/goods?category=gas-detectors");
    render(<SafetyGoodsPanel />);
    fireEvent.click(screen.getByRole("button", { name: /用品一覧に戻る/ }));
    expect(screen.getByRole("button", { name: "ガス検知器・酸素濃度計" })).toBeDefined();
    expect(screen.getByRole("button", { name: /現場の補助用品/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
