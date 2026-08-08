import { afterEach, describe, expect, it, vi } from "vitest";
import { OPTIONAL_TRACKING_CONSENT_KEY } from "./analytics-privacy";

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  delete window.gtag;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Visual KY analytics URL boundary", () => {
  it("does not emit a custom event from a query URL even after consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST");
    window.localStorage.setItem(
      OPTIONAL_TRACKING_CONSENT_KEY,
      "granted",
    );
    window.history.replaceState(
      {},
      "",
      "/training/visual-ky/scaffold-fall?result=complete",
    );
    const gtag = vi.fn();
    window.gtag = gtag;

    const { trackEvent } = await import("./track-events");
    trackEvent("visual_ky_complete", {
      scenario_id: "vkyt-001",
      category: "scaffold",
    });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("emits only coarse explicit params from a query-free URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST");
    window.localStorage.setItem(
      OPTIONAL_TRACKING_CONSENT_KEY,
      "granted",
    );
    window.history.replaceState(
      {},
      "",
      "/training/visual-ky/scaffold-fall",
    );
    const gtag = vi.fn();
    window.gtag = gtag;

    const { trackEvent } = await import("./track-events");
    trackEvent("visual_ky_complete", {
      scenario_id: "vkyt-001",
      category: "scaffold",
      query: "never-send",
    });

    expect(gtag).toHaveBeenCalledWith("event", "visual_ky_complete", {
      scenario_id: "vkyt-001",
      category: "scaffold",
    });
  });
});
