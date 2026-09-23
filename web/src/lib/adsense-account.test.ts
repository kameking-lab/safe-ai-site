import { describe, expect, it } from "vitest";
import {
  ADSENSE_ACCOUNT_META,
  adsenseAccountMetadata,
} from "./adsense-account";

describe("AdSense account metadata", () => {
  it("publishes the ads.txt account in Google's required ca-pub format", () => {
    expect(ADSENSE_ACCOUNT_META).toBe("ca-pub-8751260838396451");
    expect(adsenseAccountMetadata()).toEqual({
      "google-adsense-account": "ca-pub-8751260838396451",
    });
  });
});
