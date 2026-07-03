import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { SignageRotator } from "./signage-rotator";

/**
 * サイネージ「動かない掲示板」問題（Fable診断01 T5）の回帰ガード。
 * ニュース・法改正の複数件パネルが一定間隔で自動的に中身を切り替えること、
 * 手動操作（ドット・ホバー）が優先されることを検証する。
 */

type Item = { id: string; label: string };
const ITEMS: Item[] = [
  { id: "a", label: "1件目" },
  { id: "b", label: "2件目" },
  { id: "c", label: "3件目" },
];

function renderRotator(items: Item[] = ITEMS, intervalMs = 1000) {
  return render(
    <SignageRotator
      items={items}
      intervalMs={intervalMs}
      ariaLabel="テストパネル"
      getKey={(item) => item.id}
      renderItem={(item) => <p>{item.label}</p>}
    />,
  );
}

describe("SignageRotator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("件数0では何も描画しない", () => {
    const { container } = renderRotator([]);
    expect(container.firstChild).toBeNull();
  });

  it("1件のみでは進捗ドットを出さず、自動切替も走らない", () => {
    renderRotator([ITEMS[0]!]);
    expect(screen.getByText("1件目")).toBeDefined();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("一定間隔で自動的に次の項目へ切り替わる（6分間放置でもDOMが変化し続ける想定の基礎）", () => {
    renderRotator();
    expect(screen.getByText("1件目")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("2件目")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("3件目")).toBeDefined();

    // 周回して1件目に戻る
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("1件目")).toBeDefined();
  });

  it("進捗ドットをクリックすると即座にその項目へ切り替わる", () => {
    renderRotator();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    fireEvent.click(tabs[2]!);
    expect(screen.getByText("3件目")).toBeDefined();
    expect(tabs[2]!.getAttribute("aria-selected")).toBe("true");
  });

  // 柱0: 進捗ドットのタップ標的が44×44pxであること（min-h-[24px]への退行を防ぐ）。
  it("進捗ドットが44×44pxタップ標的", () => {
    renderRotator();
    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      expect(tab.className).toContain("min-h-[44px]");
      expect(tab.className).toContain("min-w-[44px]");
    }
  });

  it("マウスホバー中は自動切替を一時停止する", () => {
    const { container } = renderRotator();
    const root = container.firstElementChild as HTMLElement;

    fireEvent.mouseEnter(root);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("1件目")).toBeDefined();

    fireEvent.mouseLeave(root);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("2件目")).toBeDefined();
  });
});
