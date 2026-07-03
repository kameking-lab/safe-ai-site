import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SavedAccidents } from "./saved-accidents";

const STORAGE_KEY = "safe-ai:favorites:v1";

function seed() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        kind: "accident",
        id: "acc-1",
        title: "足場からの墜落",
        subtitle: "建設業・墜落",
        href: "/accidents/acc-1",
        addedAt: "2026-06-14T00:00:00.000Z",
      },
    ]),
  );
}

describe("SavedAccidents", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("保存が無いときは何も表示しない", () => {
    const { container } = render(<SavedAccidents />);
    expect(container.firstChild).toBeNull();
  });

  it("保存済み事例を一覧表示", async () => {
    seed();
    render(<SavedAccidents />);
    expect(await screen.findByText("足場からの墜落")).toBeDefined();
  });

  // 柱0: 削除ボタンは小アイコンだが現場で押せること。44×44px(h-11 w-11)を満たす
  // （px-2 py-1 ≈24px への退行を防ぐ）。
  it("削除ボタンが 44×44px タップ標的", async () => {
    seed();
    render(<SavedAccidents />);
    const btn = await screen.findByRole("button", { name: "保存から削除" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("w-11");
  });

  // 柱0: 主遷移リンク(タイトル+サブタイトル)自体もmin-h-[44px]を満たすこと
  // （隣の削除ボタンだけ44pxで遷移リンク側が34-36pxへ退行するのを防ぐ）。
  it("事故事例へのリンクが min-h-[44px] タップ標的", async () => {
    seed();
    render(<SavedAccidents />);
    const link = (await screen.findByText("足場からの墜落")).closest("a");
    expect(link?.className).toContain("min-h-[44px]");
  });

  // 色の文法: サイト共通の「保存済み」表現は amber 系（favorites-list.tsx と同一）。
  // yellow 直書きへの退行を防ぐ。
  it("保存済みセクションが amber 系で統一されている（yellow直書き禁止）", async () => {
    seed();
    const { container } = render(<SavedAccidents />);
    await screen.findByText("足場からの墜落");
    expect(container.innerHTML).not.toContain("yellow-");
    expect(container.innerHTML).toContain("amber-");
  });
});
