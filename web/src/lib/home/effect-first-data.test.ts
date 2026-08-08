import { describe, expect, it } from "vitest";
import {
  buildHomeAccidentPreview,
  HOME_ADDITIONAL_LAW_REFORMS,
  HOME_FEATURED_LAW_REFORM,
} from "./effect-first-data";

describe("effect-first home verified data", () => {
  it("uses the fetched MHLW monthly aggregate without synthetic records", () => {
    const preview = buildHomeAccidentPreview();

    expect(preview.featured.synthetic).toBe(false);
    expect(preview.featured.status).toContain("official");
    expect(preview.featured.period.normalize("NFKC")).toContain("令和8年");
    expect(preview.featured.checkedAt).toBe("2026-07-31");
    expect(preview.featured.deaths).toBe(199);
    expect(preview.featured.injuries).toBe(43_835);
    expect(preview.featured.sourceUrl).toMatch(/^https:\/\/anzeninfo\.mhlw\.go\.jp\//);
  });

  it("keeps the featured reform's date, audience, action, and primary source together", () => {
    expect(HOME_FEATURED_LAW_REFORM.promulgatedAt).toBe("2026-04-28");
    expect(HOME_FEATURED_LAW_REFORM.effectiveAt).toBe("2026-08-01");
    expect(HOME_FEATURED_LAW_REFORM.target).toContain("産業医");
    expect(HOME_FEATURED_LAW_REFORM.action).toContain("8月1日");
    expect(HOME_FEATURED_LAW_REFORM.sourceState).toBe("一次資料確認済み");
    expect(HOME_FEATURED_LAW_REFORM.sourceUrl).toMatch(/^https:\/\/www\.mhlw\.go\.jp\//);
    expect(HOME_ADDITIONAL_LAW_REFORMS).toHaveLength(2);
  });
});
