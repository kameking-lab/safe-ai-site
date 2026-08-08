import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RumWebVitals } from "./rum-web-vitals";

const mocks = vi.hoisted(() => ({
  callback: null as null | ((metric: {
    name: string;
    value: number;
    rating: string;
    navigationType: string;
  }) => void),
}));

vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (
    callback: NonNullable<typeof mocks.callback>,
  ) => {
    mocks.callback = callback;
  },
}));

const CONSENT_KEY = "safe-ai:optional-tracking-consent:v1";
const BUCKET_KEY = "safe-ai:rum-session-bucket:v1";
const metric = {
  name: "LCP",
  value: 2_100,
  rating: "good",
  navigationType: "navigate",
};
const originalDoNotTrack = Object.getOwnPropertyDescriptor(
  window.navigator,
  "doNotTrack",
);
const originalGpc = Object.getOwnPropertyDescriptor(
  window.navigator,
  "globalPrivacyControl",
);

function setPrivacySignals(options: { dnt?: boolean; gpc?: boolean }) {
  Object.defineProperty(window.navigator, "doNotTrack", {
    configurable: true,
    value: options.dnt ? "1" : "0",
  });
  Object.defineProperty(window.navigator, "globalPrivacyControl", {
    configurable: true,
    value: Boolean(options.gpc),
  });
}

function bucketWrites(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.filter((call) => call[0] === BUCKET_KEY);
}

describe("RumWebVitals storage consent boundary", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.callback = null;
    window.history.replaceState({}, "", "/");
    if (originalDoNotTrack) {
      Object.defineProperty(
        window.navigator,
        "doNotTrack",
        originalDoNotTrack,
      );
    } else {
      Reflect.deleteProperty(window.navigator, "doNotTrack");
    }
    if (originalGpc) {
      Object.defineProperty(
        window.navigator,
        "globalPrivacyControl",
        originalGpc,
      );
    } else {
      Reflect.deleteProperty(window.navigator, "globalPrivacyControl");
    }
    vi.restoreAllMocks();
  });

  it("does not create an anonymous bucket before explicit consent", () => {
    setPrivacySignals({});
    window.history.replaceState({}, "", "/safety-ai");
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");

    render(<RumWebVitals buildId="build_20260729" sampleRate={1} />);
    act(() => mocks.callback?.(metric));

    expect(bucketWrites(storageWrite)).toHaveLength(0);
    expect(sessionStorage.getItem(BUCKET_KEY)).toBeNull();
  });

  it.each([
    { name: "DNT", signals: { dnt: true } },
    { name: "GPC", signals: { gpc: true } },
  ])(
    "does not create an anonymous bucket for consented $name users",
    ({ signals }) => {
      localStorage.setItem(CONSENT_KEY, "granted");
      setPrivacySignals(signals);
      window.history.replaceState({}, "", "/safety-ai");
      const storageWrite = vi.spyOn(Storage.prototype, "setItem");

      render(<RumWebVitals buildId="build_20260729" sampleRate={1} />);
      act(() => mocks.callback?.(metric));

      expect(bucketWrites(storageWrite)).toHaveLength(0);
      expect(sessionStorage.getItem(BUCKET_KEY)).toBeNull();
    },
  );

  it("does not create a bucket on a sensitive route after consent", () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    setPrivacySignals({});
    window.history.replaceState({}, "", "/services/automation");
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");

    render(<RumWebVitals buildId="build_20260729" sampleRate={1} />);
    act(() => mocks.callback?.(metric));

    expect(bucketWrites(storageWrite)).toHaveLength(0);
    expect(sessionStorage.getItem(BUCKET_KEY)).toBeNull();
  });
});
