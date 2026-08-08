import "server-only";

import { unstable_cache } from "next/cache";
import { getSignageLocationById } from "@/data/signage-locations";
import {
  loadEnvironmentNationalHeatAlertSummary,
  loadEnvironmentWbgtStatus,
  type EnvironmentNationalHeatAlertSummary,
  type EnvironmentWbgtStatus,
} from "@/lib/heat-illness/environment-wbgt";

const HOME_UPSTREAM_TIMEOUT_MS = 2_200;

const fastHomeFetch: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(HOME_UPSTREAM_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
};

const getCachedAreaWbgt = unstable_cache(
  async (areaId: string): Promise<EnvironmentWbgtStatus | null> => {
    const location = getSignageLocationById(areaId);
    return location
      ? loadEnvironmentWbgtStatus({
          location,
          fetchImpl: fastHomeFetch,
        })
      : null;
  },
  ["effect-first-home-area-wbgt-v1"],
  { revalidate: 120 },
);

const getCachedNationalHeat = unstable_cache(
  async (): Promise<EnvironmentNationalHeatAlertSummary> =>
    loadEnvironmentNationalHeatAlertSummary({ fetchImpl: fastHomeFetch }),
  ["effect-first-home-national-heat-alert-v1"],
  { revalidate: 300 },
);

export async function loadHomeHeatInitialData(areaId: string | null): Promise<{
  wbgt: EnvironmentWbgtStatus | null;
  national: EnvironmentNationalHeatAlertSummary | null;
}> {
  if (areaId) {
    return {
      wbgt: await getCachedAreaWbgt(areaId),
      national: null,
    };
  }
  return {
    wbgt: null,
    national: await getCachedNationalHeat(),
  };
}
