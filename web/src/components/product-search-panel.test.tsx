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

    fireEvent.change(screen.getByPlaceholderText("例: 製品名、型番"), {
      target: { value: "存在しない製品名" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SDS DBを検索" }));

    await waitFor(() => {
      expect(
        screen.getByText("該当する製品が内蔵データに見つかりませんでした。メーカー公式サイトの最新SDSを確認してください。"),
      ).toBeDefined();
    });

    const dbLink = screen.getByRole("link", { name: "成分名を化学物質検索DBで確認" });
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

    fireEvent.change(screen.getByPlaceholderText("例: 製品名、型番"), {
      target: { value: "テスト製品" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SDS DBを検索" }));

    await waitFor(() => {
      expect(screen.getByText("テスト製品")).toBeDefined();
    });

    expect(screen.queryByText(/メーカー公式サイトの最新SDS/)).toBeNull();
  });

  it("未入力で検索した場合は入力エラーのみ表示し、空状態CTAは出さない", async () => {
    mockFetchOnce({ hits: [] });
    render(<ProductSearchPanel />);

    fireEvent.click(screen.getByRole("button", { name: "SDS DBを検索" }));

    await waitFor(() => {
      expect(screen.getByText("製品名を入力してください。")).toBeDefined();
    });
    expect(screen.queryByText(/メーカー公式サイトの最新SDS/)).toBeNull();
  });
});
