import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStorePromo } from "./app-store-promo";
import { APP_STORE, appStoreItunesMetadata, shouldShowAppStorePromo } from "@/lib/app-store";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", "true");
  vi.stubEnv("NEXT_PUBLIC_ANZEN_NATIVE", "");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

describe("App Store promo", () => {
  it("points at the 安全AI App Store page", () => {
    expect(APP_STORE.appId).toBe("6831079439");
    expect(APP_STORE.url).toBe("https://apps.apple.com/jp/app/id6831079439");
  });

  it.each([undefined, "", "false", "TRUE", "1"])("hides the badge and Smart App Banner before publication (%s)", (flag) => {
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", flag);
    const { container } = render(<AppStorePromo />);
    expect(container.innerHTML).toBe("");
    expect(shouldShowAppStorePromo()).toBe(false);
    expect(appStoreItunesMetadata()).toBeUndefined();
  });

  it("shows one official badge and Smart App Banner only when publication is enabled", () => {
    const { container } = render(<AppStorePromo />);
    const link = screen.getByRole("link", { name: "安全AIをApp Storeでダウンロード" });
    expect(link.getAttribute("href")).toBe(APP_STORE.url);
    expect(container.querySelectorAll("a")).toHaveLength(1);
    const image = screen.getByRole("img", { name: "安全AIをApp Storeでダウンロード" });
    expect(image.getAttribute("src")).toBe("/app-store/download-on-the-app-store-ja.svg");
    expect(image.getAttribute("height")).toBe("40");
    expect(image.className).toContain("w-auto");
    expect(container.querySelector('[data-app-store-promo="footer"]')?.className).toContain("p-2.5");
    expect(appStoreItunesMetadata()).toEqual({ appId: "6831079439" });
  });

  it("never renders, nor adds the Smart App Banner, in the iOS app bundle build", () => {
    vi.stubEnv("NEXT_PUBLIC_ANZEN_NATIVE", "true");
    const { container } = render(<AppStorePromo />);
    expect(container.innerHTML).toBe("");
    expect(appStoreItunesMetadata()).toBeUndefined();
  });

  it("stays hidden inside a Capacitor native WebView", () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = { isNativePlatform: () => true };
    expect(shouldShowAppStorePromo()).toBe(false);
    const { container } = render(<AppStorePromo />);
    expect(container.innerHTML).toBe("");
  });

  it("does not hide the badge for Capacitor's web platform", () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = { isNativePlatform: () => false };
    render(<AppStorePromo />);
    expect(screen.getByRole("link", { name: "安全AIをApp Storeでダウンロード" })).toBeTruthy();
  });

  it("does not appear in server HTML, so nothing flashes before the browser check", () => {
    expect(renderToString(<AppStorePromo />)).toBe("");
  });
});
