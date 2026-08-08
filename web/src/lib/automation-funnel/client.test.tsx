import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  OPTIONAL_TRACKING_CONSENT_EVENT,
  OPTIONAL_TRACKING_CONSENT_KEY,
} from "@/lib/analytics-privacy";
import { AutomationFunnelConsentBoundary } from "./client";

const BUCKET_KEY = "safe-ai:automation-funnel-session-bucket:v1";
const CTA_KEY = "safe-ai:automation-funnel-cta-position:v1";

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("automation funnel consent boundary", () => {
  it("clears a pre-existing bucket on mount when consent is absent", () => {
    window.sessionStorage.setItem(BUCKET_KEY, "af_0123456789abcdef01234567");
    window.sessionStorage.setItem(CTA_KEY, "hero");

    render(<AutomationFunnelConsentBoundary />);

    expect(window.sessionStorage.getItem(BUCKET_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(CTA_KEY)).toBeNull();
  });

  it("immediately clears bucket and CTA attribution on consent withdrawal", () => {
    window.localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, "granted");
    render(<AutomationFunnelConsentBoundary />);
    window.sessionStorage.setItem(BUCKET_KEY, "af_0123456789abcdef01234567");
    window.sessionStorage.setItem(CTA_KEY, "heat_hub");

    act(() => {
      window.dispatchEvent(
        new CustomEvent(OPTIONAL_TRACKING_CONSENT_EVENT, {
          detail: "denied",
        }),
      );
    });

    expect(window.sessionStorage.getItem(BUCKET_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(CTA_KEY)).toBeNull();
  });
});
