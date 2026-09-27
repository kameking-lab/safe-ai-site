import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdSenseScript from "./AdSenseScript";

vi.mock("@/lib/adsense-account", () => ({
  configuredAdsensePublisherId: () => "ca-pub-test",
}));

afterEach(() => {
  document.getElementById("adsense-init")?.remove();
  window.history.replaceState(null, "", "/");
});

describe("AdSenseScript", () => {
  it("inserts the script immediately only on an eligible reading page", () => {
    window.history.replaceState(null, "", "/laws");
    const view = render(<AdSenseScript nonce="test-nonce" />);
    const script = document.getElementById("adsense-init") as HTMLScriptElement | null;
    expect(script?.src).toContain("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
    expect(script?.nonce).toBe("test-nonce");
    view.unmount();

    window.history.replaceState(null, "", "/guides/annual-safety-plan-generator");
    render(<AdSenseScript />);
    expect(document.querySelectorAll("#adsense-init")).toHaveLength(1);
  });

  it("does not insert on a tool or unknown detail page", () => {
    window.history.replaceState(null, "", "/articles/unknown");
    render(<AdSenseScript />);
    expect(document.getElementById("adsense-init")).toBeNull();
  });
});
