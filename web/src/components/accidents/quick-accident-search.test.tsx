import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuickAccidentSearch } from "./quick-accident-search";
import {
  ACCIDENT_TRANSIENT_SEARCH_EVENT,
  clearTransientAccidentKeyword,
} from "@/lib/accidents/transient-search";

afterEach(() => {
  clearTransientAccidentKeyword();
  window.history.replaceState({}, "", "/");
});

describe("QuickAccidentSearch", () => {
  it("キーワード入力欄と検索ボタンを表示", () => {
    render(<QuickAccidentSearch />);
    expect(screen.getByRole("searchbox", { name: "事故事例キーワード検索" })).toBeDefined();
    expect(screen.getByRole("button", { name: "検索" })).toBeDefined();
  });

  it("事故型リンクを初期表示へ並べない", () => {
    const { container } = render(<QuickAccidentSearch />);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.queryByText("事故型から選ぶ")).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  // 柱0: 最上部のクイック検索は現場ペルソナが最初に触れる操作。
  // 入力欄・検索ボタン・型チップが全て 44px タップ標的を満たすこと
  // （py-2 ≈38px / min-h-[36px] への退行を防ぐ）。
  it("入力欄・検索ボタンが min-h-[44px]", () => {
    render(<QuickAccidentSearch />);
    expect(screen.getByRole("searchbox").className).toContain("min-h-[44px]");
    expect(screen.getByRole("button", { name: "検索" }).className).toContain("min-h-[44px]");
  });

  it("初期操作を検索入力と検索ボタンの2件に限定する", () => {
    const { container } = render(<QuickAccidentSearch />);
    expect(container.querySelectorAll("input, button, a, summary")).toHaveLength(2);
  });

  it("検索本文をURLへ書かず、メモリ内の検索イベントだけを送る", () => {
    window.history.replaceState({}, "", "/accidents?acc_type=墜落");
    const listener = vi.fn();
    window.addEventListener(ACCIDENT_TRANSIENT_SEARCH_EVENT, listener);
    render(<QuickAccidentSearch />);

    const keyword = "山田太郎 新宿A現場";
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: keyword },
    });
    fireEvent.submit(screen.getByRole("searchbox").closest("form")!);

    expect(window.location.search).toBe("?acc_type=%E5%A2%9C%E8%90%BD");
    expect(window.location.href).not.toContain(encodeURIComponent(keyword));
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      keyword,
    });
    window.removeEventListener(ACCIDENT_TRANSIENT_SEARCH_EVENT, listener);
  });
});
