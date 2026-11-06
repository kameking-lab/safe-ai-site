import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStorePromo } from "./app-store-promo";
import { APP_STORE, appStoreItunesMetadata, shouldShowAppStorePromo } from "@/lib/app-store";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

const both = () => (
  <>
    <AppStorePromo variant="card" />
    <AppStorePromo variant="footer" />
  </>
);

describe("App Store promo", () => {
  it("points at the 安全AI App Store page", () => {
    expect(APP_STORE.appId).toBe("6831079439");
    expect(APP_STORE.url).toBe("https://apps.apple.com/jp/app/id6831079439");
  });

  it("is absent, with no Smart App Banner, while the flag is off (the default)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", "");
    const { container } = render(both());
    expect(container.innerHTML).toBe("");
    expect(appStoreItunesMetadata()).toBeUndefined();
  });

  it("shows the card and footer line to web visitors when live", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", "true");
    const { container } = render(both());
    const card = container.querySelector('[data-app-store-promo="card"]');
    expect(card?.getAttribute("href")).toBe(APP_STORE.url);
    expect(card?.textContent).toContain("iPhoneアプリでも使えます");
    expect(card?.textContent).toContain("App Storeでダウンロード");
    const footer = screen.getByRole("link", { name: "安全AIはiPhoneアプリでも使えます — App Storeでダウンロード" });
    expect(footer.getAttribute("href")).toBe(APP_STORE.url);
    for (const img of container.querySelectorAll("img")) expect(img.getAttribute("alt")).toBe("");
    expect(appStoreItunesMetadata()).toEqual({ appId: "6831079439" });
  });

  it("never renders, nor adds the Smart App Banner, in the iOS app bundle build", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", "true");
    vi.stubEnv("NEXT_PUBLIC_ANZEN_NATIVE", "true");
    const { container } = render(both());
    expect(container.innerHTML).toBe("");
    expect(appStoreItunesMetadata()).toBeUndefined();
  });

  it("stays hidden inside a Capacitor native WebView even if the flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", "true");
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = { isNativePlatform: () => true };
    expect(shouldShowAppStorePromo()).toBe(false);
    const { container } = render(both());
    expect(container.innerHTML).toBe("");
  });

  it("does not appear in server HTML, so nothing flashes before the browser check", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_LIVE", "true");
    expect(renderToString(<AppStorePromo variant="card" />)).toBe("");
  });
});
