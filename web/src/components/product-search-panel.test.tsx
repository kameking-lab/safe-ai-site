import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductSearchPanel } from "./product-search-panel";

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductSearchPanel ゼロヒットCTA", () => {
  it("ヒット0件のとき、汎用エラーではなく専用の空状態CTAを表示する", async () => {
    mockFetchOnce({ hits: [], source: "internal-db" });
    render(<ProductSearchPanel />);

    fireEvent.change(screen.getByPlaceholderText("例: KURE 5-56、ラッカーシンナー"), {
      target: { value: "存在しない製品名" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SDS DB を検索" }));

    await waitFor(() => {
      expect(
        screen.getByText("該当する製品が見つかりませんでした（主要10製品収録）。次のいずれかをお試しください。"),
      ).toBeDefined();
    });

    const raLink = screen.getByRole("link", { name: "化学物質RA（手入力）で成分名から評価する" });
    const dbLink = screen.getByRole("link", { name: "化学物質検索DBで物質名を調べる" });
    expect(raLink.getAttribute("href")).toBe("/chemical-ra");
    expect(dbLink.getAttribute("href")).toBe("/chemical-database");
  });

  it("ヒットありのときは空状態CTAを表示しない", async () => {
    mockFetchOnce({
      hits: [
        {
          id: "p1",
          productName: "テスト製品",
          manufacturer: "テスト工業",
          category: "塗料",
          use: "塗装",
          components: [{ name: "トルエン", cas: "108-88-3", contentPct: 10 }],
          sdsRevised: "2026-01-01",
        },
      ],
      source: "internal-db",
    });
    render(<ProductSearchPanel />);

    fireEvent.change(screen.getByPlaceholderText("例: KURE 5-56、ラッカーシンナー"), {
      target: { value: "テスト製品" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SDS DB を検索" }));

    await waitFor(() => {
      expect(screen.getByText("テスト製品")).toBeDefined();
    });

    expect(screen.queryByText(/次のいずれかをお試しください/)).toBeNull();
  });

  it("未入力で検索した場合は入力エラーのみ表示し、空状態CTAは出さない", async () => {
    mockFetchOnce({ hits: [] });
    render(<ProductSearchPanel />);

    fireEvent.click(screen.getByRole("button", { name: "SDS DB を検索" }));

    await waitFor(() => {
      expect(screen.getByText("製品名を入力してください。")).toBeDefined();
    });
    expect(screen.queryByText(/次のいずれかをお試しください/)).toBeNull();
  });
});
