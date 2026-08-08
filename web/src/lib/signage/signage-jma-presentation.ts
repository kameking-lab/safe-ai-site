import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import type { WeatherBundleStatus } from "@/lib/signage/weather-warning-panel-state";

export function selectSignageJmaPresentation(
  bundle: SignageDataApiResponse | null,
  bundleStatus: WeatherBundleStatus,
) {
  const datasetDegraded =
    bundle?.degradedSources?.includes("jma") ?? false;
  const selectedRegionLive = bundle?.jmaSelectedState === "live";

  return {
    datasetDegraded,
    selectedRegionLive,
    prefectureLevels: bundle?.prefectureLevels ?? {},
    warningPanelStatus:
      bundleStatus === "success" && !selectedRegionLive
        ? ("error" as const)
        : bundleStatus,
    headline: selectedRegionLive ? bundle?.jmaHeadline ?? null : null,
    selectedWarnings: selectedRegionLive
      ? bundle?.selectedWarnings ?? []
      : [],
  };
}
