import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionalThirdPartyScripts } from "./OptionalThirdPartyScripts";
import { OPTIONAL_TRACKING_CONSENT_KEY } from "@/lib/analytics-privacy";

let currentPathname = "/laws";
vi.mock("next/navigation", () => ({ usePathname: () => currentPathname }));
vi.mock("@/components/Analytics", () => ({ default: () => <div data-testid="analytics-script" /> }));
vi.mock("@/components/AdSenseScript", () => ({ default: () => <div data-testid="ads-script" /> }));

afterEach(() => {
  currentPathname = "/laws";
  localStorage.clear();
  Reflect.deleteProperty(window, "gtag");
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window.navigator, "globalPrivacyControl");
  Reflect.deleteProperty(window.navigator, "doNotTrack");
});

describe("OptionalThirdPartyScripts consent lifecycle", () => {
  it("does not place Cookie controls over the chatbot composer", async () => {
    currentPathname = "/chatbot";
    render(<OptionalThirdPartyScripts analyticsEnabled adsEnabled rumEnabled />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cookie設定" })).toBeNull();
      expect(screen.queryByRole("region", { name: "任意Cookieの設定" })).toBeNull();
    });
    expect(screen.queryByTestId("analytics-script")).toBeNull();
    expect(screen.queryByTestId("ads-script")).toBeNull();
  });

  it("loads no third-party script until the user explicitly grants consent", async () => {
    render(<OptionalThirdPartyScripts analyticsEnabled adsEnabled />);
    expect(screen.queryByTestId("analytics-script")).toBeNull();
    expect(screen.queryByTestId("ads-script")).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "許可する" }));
    expect(await screen.findByTestId("analytics-script")).toBeTruthy();
    expect(screen.getByTestId("ads-script")).toBeTruthy();
    expect(localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY)).toBe("granted");
  });

  it("withdraws consent, sends Consent Mode denial, and unmounts scripts", async () => {
    localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, "granted");
    const gtag = vi.fn();
    window.gtag = gtag;
    document.cookie = "_ga=host-only; Path=/";
    document.cookie = "_gid=host-only; Path=/";
    document.cookie = "portal_preference=keep; Path=/";
    render(<OptionalThirdPartyScripts analyticsEnabled adsEnabled />);
    await screen.findByTestId("analytics-script");

    fireEvent.click(screen.getByRole("button", { name: "Cookie設定" }));
    fireEvent.click(screen.getByRole("button", { name: "拒否する" }));

    await waitFor(() => expect(screen.queryByTestId("analytics-script")).toBeNull());
    expect(screen.queryByTestId("ads-script")).toBeNull();
    expect(localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY)).toBe("denied");
    expect(gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
      analytics_storage: "denied",
      ad_storage: "denied",
    }));
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_gid=");
    expect(document.cookie).toContain("portal_preference=keep");
  });

  it.each([
    ["GPC", "globalPrivacyControl", true],
    ["DNT", "doNotTrack", "1"],
  ] as const)(
    "does not mount Analytics, Ads, or RUM after prior consent when %s opts out",
    async (_label, key, value) => {
      localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, "granted");
      Object.defineProperty(window.navigator, key, {
        configurable: true,
        value,
      });

      render(
        <OptionalThirdPartyScripts
          analyticsEnabled
          adsEnabled
          rumEnabled
        />,
      );

      await screen.findByRole("button", { name: "Cookie設定" });
      expect(screen.queryByTestId("analytics-script")).toBeNull();
      expect(screen.queryByTestId("ads-script")).toBeNull();
    },
  );
});
