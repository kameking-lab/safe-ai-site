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
    expect(screen.getByRole("button", { name: /防じんマスク/u })).toBeDefined();
    expect(screen.queryByRole("button", { name: "ガス検知器・酸素濃度計" })).toBeNull();
  });

  it("補助用品の直リンクから一覧に戻っても元の分類を表示する", () => {
    window.history.replaceState(null, "", "/goods?category=gas-detectors");
    render(<SafetyGoodsPanel />);
    fireEvent.click(screen.getByRole("button", { name: /用品一覧に戻る/ }));
    expect(screen.getByRole("button", { name: "ガス検知器・酸素濃度計" })).toBeDefined();
    expect(screen.getByRole("button", { name: /現場の補助用品/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("検索語と分類を保ったまま詳細を開き、一覧に戻れる", () => {
    render(<SafetyGoodsPanel />);
    const search = screen.getByRole("searchbox", { name: "用品名・作業から探す" });
    fireEvent.change(search, { target: { value: "防塵" } });
    expect(screen.getByText(/1つの入口を表示/)).toBeDefined();
    expect(screen.getByRole("button", { name: /防じんマスク/u })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /防じんマスク/u }));
    expect(window.location.search).toBe("?category=respiratory&intent=dust");
    expect(window.history.state.goodsDirectory).toMatchObject({ group: "all", query: "防塵", lastCategory: "respiratory", lastEntry: "respiratory-dust" });
    fireEvent.click(screen.getByRole("button", { name: /用品一覧に戻る/ }));
    expect(search).toHaveProperty("value", "防塵");
    expect(screen.getByRole("button", { name: /防じんマスク/u })).toBeDefined();
    expect(window.location.search).toBe("");
  });

  it("防じん・防毒を別画像入口にし、URL意図と危険条件の停止を保つ", () => {
    render(<SafetyGoodsPanel />);
    const dust = screen.getByRole("button", { name: /防じんマスク粉じん・ヒューム・ミスト/u });
    const gas = screen.getByRole("button", { name: /防毒マスクガス・蒸気/u });
    expect(dust.querySelector("img")?.getAttribute("src")).toContain("dust-mask-required.webp");
    expect(gas.querySelector("img")?.getAttribute("src")).toContain("respiratory-protection-required.webp");

    fireEvent.click(gas);
    expect(window.location.search).toBe("?category=respiratory&intent=gas");
    expect(screen.getByRole("button", { name: /ガス・蒸気を防ぐ/u }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /酸素欠乏のおそれ/u }));
    expect(window.location.search).toContain("feature=oxygen");
    expect(screen.getByText(/対象の物質や作業条件が分かるまで、商品候補は表示しません/u)).toBeDefined();
    expect(screen.queryByText(/Amazonで探す/u)).toBeNull();
  });

  it("確認済み条件だけ候補へ進み、直リンクのfeatureだけでは迂回できない", () => {
    window.history.replaceState(null, "", "/goods?category=respiratory&intent=dust&feature=dust");
    const view = render(<SafetyGoodsPanel />);
    expect(screen.getByRole("heading", { name: "次に、6つの安全条件を確認する" })).toBeDefined();
    expect(screen.queryByText(/Amazonで探す/u)).toBeNull();
    view.unmount();

    window.history.replaceState(null, "", "/goods?category=respiratory&intent=dust");
    render(<SafetyGoodsPanel />);
    for (const label of [
      /酸素濃度を測定/u,
      /対象物質名をSDS/u,
      /実際のばく露濃度/u,
      /混在していない/u,
      /緊急・救助用途ではない/u,
      /給気式を専門担当者/u,
    ]) fireEvent.click(screen.getByRole("checkbox", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: "条件を確認して商品例を見る" }));
    expect(window.location.search).toContain("conditions=confirmed");
    expect(screen.getByText(/Amazonで探す/u)).toBeDefined();
  });

  it("呼吸・送気の検索でも呼吸用入口を失わない", () => {
    render(<SafetyGoodsPanel />);
    const search = screen.getByRole("searchbox", { name: "用品名・作業から探す" });
    fireEvent.change(search, { target: { value: "呼吸用保護具" } });
    expect(screen.getByRole("button", { name: /防じんマスク/u })).toBeDefined();
    expect(screen.getByRole("button", { name: /防毒マスク/u })).toBeDefined();
    fireEvent.change(search, { target: { value: "送気" } });
    expect(screen.getAllByRole("button", { name: /マスク/u })).toHaveLength(2);
  });

  it.each(["unknown", "supplied"])("%s の直リンクは商品候補を出さず停止案内を表示する", (intent) => {
    window.history.replaceState(null, "", `/goods?category=respiratory&intent=${intent}`);
    render(<SafetyGoodsPanel />);
    expect(screen.getByText(/対象の物質や作業条件が分かるまで、商品候補は表示しません/u)).toBeDefined();
    expect(screen.queryByText(/Amazonで探す/u)).toBeNull();
    expect(screen.queryByText(/楽天(?:市場)?で探す/u)).toBeNull();
  });

  it("NETISのブラスト専用装備から来た給気式直リンクは通販候補を出さない", () => {
    window.history.replaceState(null, "", "/goods?category=respiratory&intent=supplied&feature=supplied");
    render(<SafetyGoodsPanel />);
    expect(screen.getByText(/対象の物質や作業条件が分かるまで、商品候補は表示しません/u)).toBeDefined();
    expect(screen.queryByText(/Amazonで探す/u)).toBeNull();
    expect(screen.queryByText(/楽天(?:市場)?で探す/u)).toBeNull();
  });
});
