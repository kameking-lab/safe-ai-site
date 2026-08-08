import { describe, expect, it } from "vitest";
import {
  getHeatCampaignPresentation,
  HEAT_ILLNESS_CAMPAIGN_PERIOD,
  isHeatIllnessCampaignSeason,
} from "./campaign-season";

describe("heat illness campaign season", () => {
  it("JSTの5月1日から9月30日だけ大型表示する", () => {
    expect(isHeatIllnessCampaignSeason(new Date("2026-04-30T14:59:59Z"))).toBe(
      false,
    );
    expect(isHeatIllnessCampaignSeason(new Date("2026-04-30T15:00:00Z"))).toBe(
      true,
    );
    expect(isHeatIllnessCampaignSeason(new Date("2026-09-30T14:59:59Z"))).toBe(
      true,
    );
    expect(isHeatIllnessCampaignSeason(new Date("2026-09-30T15:00:00Z"))).toBe(
      false,
    );
  });

  it("基準日の表示は大型、無効日時は安全側の通常カードにする", () => {
    expect(
      getHeatCampaignPresentation(new Date("2026-07-24T00:00:00Z")),
    ).toBe("seasonal-large");
    expect(getHeatCampaignPresentation(new Date(Number.NaN))).toBe(
      "standard-card",
    );
  });

  it("期間と根拠をコード上の単一レコードで公開する", () => {
    expect(HEAT_ILLNESS_CAMPAIGN_PERIOD.timeZone).toBe("Asia/Tokyo");
    expect(HEAT_ILLNESS_CAMPAIGN_PERIOD.rationale).toContain("5月1日〜9月30日");
  });
});
