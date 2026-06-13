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
});
