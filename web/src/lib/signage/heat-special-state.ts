export const SIGNAGE_HEAT_SPECIAL_STATES = [
  "checking",
  "normal",
  "stale",
  "offline",
  "partial-failure",
  "emergency",
  "maintenance",
  "drill",
] as const;

export type SignageHeatSpecialState =
  (typeof SIGNAGE_HEAT_SPECIAL_STATES)[number];

export type SignageHeatOperationalMode =
  | "automatic"
  | "emergency"
  | "maintenance"
  | "drill";

export type SignageHeatSourceState = {
  operationalMode: SignageHeatOperationalMode;
  networkStatus: "unknown" | "online" | "offline";
  bundleStatus: "idle" | "loading" | "success" | "error";
  jmaDataTimeStale: boolean;
  openMeteoDataTimeStale: boolean;
  jmaDegraded: boolean;
  openMeteoDegraded: boolean;
  hasJmaReportTime: boolean;
  hasJmaFetchedAt: boolean;
  hasOpenMeteoFetchedAt: boolean;
  hasOpenMeteoForecastWindow: boolean;
  hasHourlyData: boolean;
};

/**
 * Maps data availability to a signage operation state.
 *
 * `normal` is returned only when the two heat-related upstream sources and
 * their timestamps are present. It describes display operation, never
 * heat-risk or work safety.
 */
export function resolveSignageHeatSpecialState({
  operationalMode,
  networkStatus,
  bundleStatus,
  jmaDataTimeStale,
  openMeteoDataTimeStale,
  jmaDegraded,
  openMeteoDegraded,
  hasJmaReportTime,
  hasJmaFetchedAt,
  hasOpenMeteoFetchedAt,
  hasOpenMeteoForecastWindow,
  hasHourlyData,
}: SignageHeatSourceState): SignageHeatSpecialState {
  if (operationalMode === "emergency") return "emergency";
  if (operationalMode === "maintenance") return "maintenance";
  if (operationalMode === "drill") return "drill";
  if (networkStatus === "offline") return "offline";
  if (
    networkStatus === "unknown" ||
    bundleStatus === "idle" ||
    bundleStatus === "loading"
  ) {
    return "checking";
  }
  if (bundleStatus === "error") return "partial-failure";
  if (jmaDataTimeStale || openMeteoDataTimeStale) return "stale";
  if (
    jmaDegraded ||
    openMeteoDegraded ||
    !hasJmaReportTime ||
    !hasJmaFetchedAt ||
    !hasOpenMeteoFetchedAt ||
    !hasOpenMeteoForecastWindow ||
    !hasHourlyData
  ) {
    return "partial-failure";
  }
  return "normal";
}
