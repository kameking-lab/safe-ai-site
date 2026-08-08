import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Google Analytics consent boundary", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/Analytics.tsx"),
    "utf8",
  );

  it("初期状態をdeniedに固定し、初期化文字列からpage_viewを直接送らない", () => {
    expect(source).toContain(
      "gtag('consent','default',{'analytics_storage':'denied'",
    );
    expect(source).not.toContain(
      "gtag('consent','default',{'analytics_storage':'granted'",
    );
    expect(source).not.toContain(
      "gtag('consent','update',{'analytics_storage':'granted'",
    );
    expect(source).not.toMatch(
      /children[^]*gtag\('event','page_view'/,
    );
  });

  it("同意確認と機微URL除外を通ったPageviewTrackerだけが閲覧イベントを送る", () => {
    expect(source).toContain("hasOptionalTrackingConsent()");
    expect(source).toContain("window.gtag('consent', 'update'");
    expect(source).toContain("sanitizedAnalyticsLocation(window.location.href)");
    expect(source).toContain("<PageviewTracker ready={ready} />");
  });
});
