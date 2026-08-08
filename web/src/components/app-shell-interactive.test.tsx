import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_SHELL_INTERACTIONS_SCRIPT } from "@/lib/app-shell-interactions-script";

type BootstrapWindow = Window &
  typeof globalThis & {
    __safeAiAppShellInteractionsDispose?: () => void;
  };

function installShell(body: string) {
  document.body.innerHTML = body;
  window.eval(APP_SHELL_INTERACTIONS_SCRIPT);
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

describe("server-rendered AppShell mobile drawer keyboard boundary", () => {
  afterEach(() => {
    (window as BootstrapWindow).__safeAiAppShellInteractionsDispose?.();
    document.body.innerHTML = "";
    document.documentElement.classList.remove("large-font", "high-contrast");
    localStorage.clear();
    history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("hydration前はactive属性とaria-currentを変更しない", () => {
    history.replaceState(null, "", "/laws");
    installShell(
      '<a href="/laws" data-app-shell-nav-href="/laws" data-nav-active="false">法改正</a>',
    );
    const link = document.querySelector<HTMLAnchorElement>("a")!;
    expect(link.dataset.navActive).toBe("false");
    expect(link.hasAttribute("aria-current")).toBe(false);
  });

  it("hydration前に開いたdrawerでも先頭の導線へfocusを渡す", async () => {
    installShell(
      '<details data-mobile-site-menu open><summary>メニュー</summary><nav id="mobile-site-menu"><a href="/notifications">通知</a></nav></details>',
    );

    await waitFor(() => expect(document.activeElement?.textContent).toBe("通知"));
  });

  it("TabとShift+Tabをdrawer内で循環させる", () => {
    installShell(
      '<details data-mobile-site-menu open><summary>メニュー</summary><nav id="mobile-site-menu"><a href="/risk">最初の導線</a><button type="button">最後の操作</button></nav></details>',
    );
    const first = document.querySelector<HTMLAnchorElement>("a")!;
    const last = document.querySelector<HTMLButtonElement>("button")!;

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("保存済みテーマをボタンの状態と読み上げ名へ同期する", () => {
    localStorage.setItem("anzen-theme", "dark");
    installShell(
      '<details data-mobile-site-menu><summary>メニュー</summary><nav id="mobile-site-menu"><button type="button" data-display-preference="theme" data-theme="system" aria-label="テーマ切替。現在は端末設定">テーマ</button></nav></details>',
    );
    const themeButton = document.querySelector<HTMLButtonElement>(
      'button[data-display-preference="theme"]',
    );
    expect(themeButton?.dataset.theme).toBe("dark");
    expect(themeButton?.getAttribute("aria-label")).toBe(
      "テーマ切替。現在はダーク",
    );
  });

  it("storageを利用できなくても表示設定を同じ画面でON・OFFできる", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    installShell(
      '<button type="button" data-display-preference="large" aria-pressed="false">文字大</button>',
    );
    const button = document.querySelector<HTMLButtonElement>("button")!;
    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("large-font")).toBe(true);
    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.classList.contains("large-font")).toBe(false);
  });
});
