import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  subscription: { findUnique: vi.fn() },
  sdsSearch: { findMany: vi.fn() },
}));
const state = vi.hoisted(() => ({ databaseAvailable: true }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user-test", email: "person@example.com" } })) }));
vi.mock("@/lib/prisma", () => ({ get prisma() { return state.databaseAvailable ? db : null; } }));
vi.mock("@/components/page-json-ld", () => ({ PageJsonLd: () => null }));

import AccountPage from "./page";

describe("無料公開中のマイページ", () => {
  afterEach(() => { state.databaseAvailable = true; vi.restoreAllMocks(); });

  it("保存履歴を表示し、旧契約の照会・課金操作へ誘導しない", async () => {
    db.subscription.findUnique.mockClear();
    db.sdsSearch.findMany.mockResolvedValue([{ id: "saved-one", productName: "保存済み製品", riskLevel: null, createdAt: new Date("2026-10-01T00:00:00Z") }]);
    render(await AccountPage({ searchParams: Promise.resolve({ portal_return: "1" }) }));
    expect(screen.getByText("全機能を無料で利用できます")).toBeDefined();
    expect(screen.getByText("保存済み製品")).toBeDefined();
    expect(db.subscription.findUnique).not.toHaveBeenCalled();
    expect(screen.queryByText(/プランをアップグレード|再加入する|プラン情報を更新しました/)).toBeNull();
    expect(screen.queryByRole("button", { name: "プラン管理" })).toBeNull();
  });

  it("履歴が読めない場合は未保存と断定せず、無料の機能案内を維持する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    db.sdsSearch.findMany.mockRejectedValue(new Error("synthetic database failure"));
    render(await AccountPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/履歴の読み込みに失敗しました/)).toBeDefined();
    expect(screen.queryByText(/保存された検索履歴はありません/)).toBeNull();
    expect(screen.getByText("全機能を無料で利用できます")).toBeDefined();
  });

  it("データベース未設定では履歴0件と断定せず、照会も実行しない", async () => {
    state.databaseAvailable = false;
    db.sdsSearch.findMany.mockClear();
    render(await AccountPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/保存済みの検索履歴を読み込めません/)).toBeDefined();
    expect(screen.queryByText(/保存された検索履歴はありません/)).toBeNull();
    expect(db.sdsSearch.findMany).not.toHaveBeenCalled();
  });
});
