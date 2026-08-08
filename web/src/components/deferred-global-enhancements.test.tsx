import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredGlobalEnhancements } from "./deferred-global-enhancements";

vi.mock("@/components/OptionalThirdPartyScripts", () => ({
  OptionalThirdPartyScripts: () => <div data-testid="optional-scripts" />,
}));
vi.mock("@/components/rum-web-vitals", () => ({
  RumWebVitals: () => <div data-testid="rum" />,
}));
vi.mock("@/lib/automation-funnel/client", () => ({
  AutomationFunnelConsentBoundary: () => <div data-testid="funnel" />,
}));
vi.mock("@/components/service-worker-registrar", () => ({
  ServiceWorkerRegistrar: () => <div data-testid="service-worker" />,
}));
vi.mock("@/components/install-pwa-prompt", () => ({
  InstallPwaPrompt: () => <div data-testid="pwa" />,
}));

describe("DeferredGlobalEnhancements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps non-critical clients out of the first-paint render", async () => {
    vi.useFakeTimers();
    render(
      <DeferredGlobalEnhancements
        analyticsEnabled
        adsEnabled={false}
        rumReady
        rumBuildId="build_20260729"
        rumSampleRate={0.1}
        previewSafetyMode={false}
      />,
    );

    expect(screen.queryByTestId("optional-scripts")).toBeNull();
    expect(screen.queryByTestId("rum")).toBeNull();
    expect(screen.queryByTestId("funnel")).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.dynamicImportSettled();
    });

    expect(screen.queryByTestId("optional-scripts")).not.toBeNull();
    expect(screen.queryByTestId("rum")).not.toBeNull();
    expect(screen.queryByTestId("funnel")).not.toBeNull();
    expect(screen.queryByTestId("service-worker")).not.toBeNull();
    expect(screen.queryByTestId("pwa")).not.toBeNull();
  });

  it("never mounts production-only clients in Preview safety mode", async () => {
    vi.useFakeTimers();
    render(
      <DeferredGlobalEnhancements
        analyticsEnabled={false}
        adsEnabled={false}
        rumReady={false}
        rumBuildId="preview"
        rumSampleRate={0}
        previewSafetyMode
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.dynamicImportSettled();
    });

    expect(screen.queryByTestId("optional-scripts")).toBeNull();
    expect(screen.queryByTestId("rum")).toBeNull();
    expect(screen.queryByTestId("funnel")).toBeNull();
    expect(screen.queryByTestId("service-worker")).toBeNull();
    expect(screen.queryByTestId("pwa")).toBeNull();
  });
});
