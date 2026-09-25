import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyCookieStatus } from "./cookie-status";

vi.mock("@/lib/rum/server-readiness", () => ({
  getRumServerReadiness: () => ({ ready: false }),
}));

afterEach(() => vi.unstubAllEnvs());

describe("AdSense privacy disclosure follows deployment capability", () => {
  it.each([
    ["production", "", "ca-pub-8751260838396451", true],
    ["production", "", "", false],
    ["production", "", "ca-pub-1234567890123456", false],
    ["preview", "", "ca-pub-8751260838396451", false],
    ["production", "true", "ca-pub-8751260838396451", false],
  ])(
    "env=%s staging=%s publisher=%s",
    (environment, staging, publisher, enabled) => {
      vi.stubEnv("VERCEL_ENV", environment);
      vi.stubEnv("SAFE_AI_STAGING_MODE", staging);
      vi.stubEnv("NEXT_PUBLIC_ADSENSE_PUB_ID", publisher);
      render(<PrivacyCookieStatus />);

      const row = screen
        .getByText("広告 Cookie（Google AdSense）：")
        .closest("li")!;
      expect(
        within(row).getByText(enabled ? "同意時のみ有効" : "無効"),
      ).toBeTruthy();
      expect(within(row).queryByText("未導入")).toBeNull();
      expect(
        screen.getByText(
          /このブラウザの同意状態や、実際の広告表示・審査状況を示すものではありません/,
        ),
      ).toBeTruthy();
    },
  );
});
