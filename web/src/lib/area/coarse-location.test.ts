import { describe, expect, it } from "vitest";
import { resolveVercelCoarseArea } from "./coarse-location";

describe("resolveVercelCoarseArea", () => {
  it("accepts only a Japanese prefecture-level CDN region", () => {
    const area = resolveVercelCoarseArea({
      country: "JP",
      countryRegion: "13",
    });

    expect(area?.id).toBe("tokyo-shinjuku");
    expect(area?.prefectureIso).toBe("JP-13");
    expect(area?.resolutionLevel).toBe("prefecture");
  });

  it("accepts JP-prefixed regions without treating them as exact locations", () => {
    const area = resolveVercelCoarseArea({
      country: "jp",
      countryRegion: "JP-27",
    });

    expect(area?.id).toBe("osaka-osaka");
    expect(area?.resolutionLabel).toContain("代表地点");
  });

  it.each([
    { country: null, countryRegion: null },
    { country: "US", countryRegion: "13" },
    { country: "JP", countryRegion: "0" },
    { country: "JP", countryRegion: "48" },
    { country: "JP", countryRegion: "Tokyo" },
  ])("fails closed for $country / $countryRegion", (input) => {
    expect(resolveVercelCoarseArea(input)).toBeNull();
  });
});
