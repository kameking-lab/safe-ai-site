import { describe, expect, it } from "vitest";
import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import { selectSignageJmaPresentation } from "./signage-jma-presentation";

function fixture(
  selectedState: SignageDataApiResponse["jmaSelectedState"],
): SignageDataApiResponse {
  return {
    fetchedAt: "2026-07-26T03:00:00.000Z",
    degradedSources: ["jma"],
    jmaSourceFetchedAt: "2026-07-26T02:55:00.000Z",
    jmaSelectedState: selectedState,
    jmaVerifiedPrefectureCount: 46,
    openMeteoFetchedAt: "2026-07-26T02:55:00.000Z",
    openMeteoForecastFrom: "2026-07-26T03:00:00.000Z",
    openMeteoForecastThrough: "2026-07-27T03:00:00.000Z",
    openMeteoTimezone: "Asia/Tokyo",
    prefectureLevels: { "JP-13": "warning" },
    laborTrend: [],
    hourly: [],
    jmaHeadline: "東京都に大雨警報",
    jmaReportTime: "2026-07-26T11:50:00+09:00",
    selectedWarnings: [{ code: "03", status: "発表" }],
    locationLabel: "東京都 新宿区",
  };
}

describe("selectSignageJmaPresentation", () => {
  it("全体degradedでも選択地域がliveなら警報・地図・通知入力を保持する", () => {
    const result = selectSignageJmaPresentation(fixture("live"), "success");
    expect(result.datasetDegraded).toBe(true);
    expect(result.warningPanelStatus).toBe("success");
    expect(result.prefectureLevels).toEqual({ "JP-13": "warning" });
    expect(result.headline).toBe("東京都に大雨警報");
    expect(result.selectedWarnings).toEqual([{ code: "03", status: "発表" }]);
  });

  it("選択地域自体が未確認なら警報なしとせずerrorに止める", () => {
    const result = selectSignageJmaPresentation(
      fixture("degraded"),
      "success",
    );
    expect(result.warningPanelStatus).toBe("error");
    expect(result.headline).toBeNull();
    expect(result.selectedWarnings).toEqual([]);
  });
});
