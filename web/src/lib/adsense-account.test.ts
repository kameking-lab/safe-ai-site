import { describe, expect, it } from "vitest";
import {
  ADSENSE_ACCOUNT_META,
  adsenseAccountMetadata,
  configuredAdsensePublisherId,
} from "./adsense-account";

describe("AdSense account metadata", () => {
  it("publishes the ads.txt account in Google's required ca-pub format", () => {
    expect(ADSENSE_ACCOUNT_META).toBe("ca-pub-8751260838396451");
    expect(adsenseAccountMetadata()).toEqual({
      "google-adsense-account": "ca-pub-8751260838396451",
    });
  });

  it("rejects a script publisher ID that does not match the verified account", () => {
    expect(configuredAdsensePublisherId(ADSENSE_ACCOUNT_META)).toBe(ADSENSE_ACCOUNT_META);
    expect(configuredAdsensePublisherId("ca-pub-1234567890123456")).toBeNull();
    expect(configuredAdsensePublisherId(undefined)).toBeNull();
  });
});
