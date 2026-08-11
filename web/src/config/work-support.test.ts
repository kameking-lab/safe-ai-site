import { describe, expect, it } from "vitest";
import {
  getPublishedMarketplaceUrl,
  WORK_SUPPORT_SERVICES,
} from "./work-support";

describe("work support marketplace links", () => {
  it("publishes all nine confirmed listings across five distinct categories", () => {
    expect(WORK_SUPPORT_SERVICES).toHaveLength(5);
    const listings = WORK_SUPPORT_SERVICES.flatMap((service) => service.listings);
    expect(listings).toHaveLength(9);
    expect(new Set(listings.map((listing) => listing.url)).size).toBe(9);
    expect(listings.every((listing) => getPublishedMarketplaceUrl(listing.url))).toBe(true);
    expect(
      Object.fromEntries(
        WORK_SUPPORT_SERVICES.map((service) => [
          service.id,
          service.listings.map((listing) => listing.url),
        ]),
      ),
    ).toEqual({
      "excel-automation": [
        "https://coconala.com/services/4349455",
        "https://coconala.com/services/4349467",
        "https://coconala.com/services/4349671",
      ],
      "safety-materials": [
        "https://coconala.com/services/4349680",
        "https://coconala.com/services/4349684",
      ],
      "kyt-materials": ["https://coconala.com/services/4349672"],
      "ai-beginner-lesson": [
        "https://coconala.com/services/3883056",
        "https://coconala.com/services/4349664",
      ],
      "claude-code-setup": ["https://coconala.com/services/4349470"],
    });
  });

  it("accepts only HTTPS Coconala URLs", () => {
    expect(getPublishedMarketplaceUrl("https://coconala.com/services/123")).toBe(
      "https://coconala.com/services/123",
    );
    expect(getPublishedMarketplaceUrl("http://coconala.com/services/123")).toBeNull();
    expect(getPublishedMarketplaceUrl("https://www.coconala.com/services/123")).toBeNull();
    expect(getPublishedMarketplaceUrl("https://coconala.com/users/123")).toBeNull();
    expect(getPublishedMarketplaceUrl("https://coconala.com/services/123?ref=external")).toBeNull();
    expect(getPublishedMarketplaceUrl("https://example.test/services/123")).toBeNull();
  });
});
