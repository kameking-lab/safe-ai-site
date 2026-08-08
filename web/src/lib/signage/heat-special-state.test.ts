import { describe, expect, it } from "vitest";
import {
  resolveSignageHeatSpecialState,
  type SignageHeatSourceState,
} from "./heat-special-state";

const HEALTHY: SignageHeatSourceState = {
  operationalMode: "automatic",
  networkStatus: "online",
  bundleStatus: "success",
  jmaDataTimeStale: false,
  openMeteoDataTimeStale: false,
  jmaDegraded: false,
  openMeteoDegraded: false,
  hasJmaReportTime: true,
  hasJmaFetchedAt: true,
  hasOpenMeteoFetchedAt: true,
  hasOpenMeteoForecastWindow: true,
  hasHourlyData: true,
};

describe("resolveSignageHeatSpecialState", () => {
  it("全取得元と時刻を確認できた場合だけnormalにする", () => {
    expect(resolveSignageHeatSpecialState(HEALTHY)).toBe("normal");
  });

  it.each([
    ["JMA degraded", { jmaDegraded: true }],
    ["Open-Meteo degraded", { openMeteoDegraded: true }],
    ["JMA対象時刻なし", { hasJmaReportTime: false }],
    ["JMA取得時刻なし", { hasJmaFetchedAt: false }],
    ["Open-Meteo取得時刻なし", { hasOpenMeteoFetchedAt: false }],
    ["Open-Meteo対象期間外", { hasOpenMeteoForecastWindow: false }],
    ["時間別予報なし", { hasHourlyData: false }],
    ["API失敗", { bundleStatus: "error" as const }],
  ])("%sを安全扱いせずpartial-failureにする", (_label, patch) => {
    expect(
      resolveSignageHeatSpecialState({ ...HEALTHY, ...patch }),
    ).toBe("partial-failure");
  });

  it("JMA・Open-Meteoの古い時刻、オフライン、初期状態を区別する", () => {
    expect(
      resolveSignageHeatSpecialState({
        ...HEALTHY,
        openMeteoDataTimeStale: true,
      }),
    ).toBe("stale");
    expect(
      resolveSignageHeatSpecialState({
        ...HEALTHY,
        jmaDataTimeStale: true,
      }),
    ).toBe("stale");
    expect(
      resolveSignageHeatSpecialState({
        ...HEALTHY,
        networkStatus: "offline",
      }),
    ).toBe("offline");
    expect(
      resolveSignageHeatSpecialState({
        ...HEALTHY,
        networkStatus: "unknown",
      }),
    ).toBe("checking");
  });

  it.each([
    ["emergency", "emergency"],
    ["maintenance", "maintenance"],
    ["drill", "drill"],
  ] as const)(
    "運用者が%sを明示した場合だけ対応状態へ遷移する",
    (operationalMode, expected) => {
      expect(
        resolveSignageHeatSpecialState({
          ...HEALTHY,
          operationalMode,
        }),
      ).toBe(expected);
    },
  );

  it("automaticはデータだけからemergency・maintenance・drillを推測しない", () => {
    expect(resolveSignageHeatSpecialState(HEALTHY)).toBe("normal");
    expect(
      resolveSignageHeatSpecialState({
        ...HEALTHY,
        bundleStatus: "error",
      }),
    ).toBe("partial-failure");
  });
});
