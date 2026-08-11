import { describe, expect, it } from "vitest";
import {
  getPublishedMarketplaceUrl,
  WORK_SUPPORT_SERVICES,
} from "./work-support";

describe("work support marketplace links", () => {
  it("keeps every marketplace link hidden until a service is public", () => {
    expect(WORK_SUPPORT_SERVICES.every((service) => service.marketplaceUrl === null)).toBe(
      true,
    );
  });

  it("accepts only HTTPS Coconala URLs", () => {
    expect(getPublishedMarketplaceUrl("https://coconala.com/services/123")).toBe(
      "https://coconala.com/services/123",
    );
    expect(getPublishedMarketplaceUrl("http://coconala.com/services/123")).toBeNull();
    expect(getPublishedMarketplaceUrl("https://example.test/services/123")).toBeNull();
  });
});
