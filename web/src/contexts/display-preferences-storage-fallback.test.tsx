import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEasyJapanese } from "@/contexts/easy-japanese-context";
import { useFurigana } from "@/contexts/furigana-context";
import { useTheme } from "@/lib/theme";

describe("表示支援設定のstorage fallback", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("localStorage書込失敗時もふりがな切替をメモリ内で反映する", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("storage unavailable", "SecurityError");
    });
    const { result } = renderHook(() => useFurigana());

    act(() => result.current.toggleFurigana());

    expect(result.current.furiganaEnabled).toBe(true);
  });

  it("localStorage書込失敗時もやさしい日本語切替をメモリ内で反映する", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("storage unavailable", "SecurityError");
    });
    const { result } = renderHook(() => useEasyJapanese());

    act(() => result.current.toggleEasyJapanese());

    expect(result.current.easyJapaneseEnabled).toBe(true);
  });

  it("localStorage書込失敗時もテーマ状態とDOMを更新する", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("storage unavailable", "SecurityError");
    });
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("dark"));

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
