import { NextRequest, NextResponse } from "next/server";
import {
  getSignageLocationById,
  type SignageLocation,
} from "@/data/signage-locations";
import { loadEnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";

export const dynamic = "force-dynamic";

const WBGT_CACHE_MS = 2 * 60 * 1_000;
const cachedByArea = new Map<
  string,
  { expiresAt: number; value: EnvironmentWbgtStatus }
>();
const inFlightByArea = new Map<string, Promise<EnvironmentWbgtStatus>>();

async function loadWithSingleFlight(
  location: SignageLocation,
): Promise<EnvironmentWbgtStatus> {
  const now = Date.now();
  const cached = cachedByArea.get(location.id);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) cachedByArea.delete(location.id);

  const existing = inFlightByArea.get(location.id);
  if (existing) return existing;
  const promise = loadEnvironmentWbgtStatus({ location });
  inFlightByArea.set(location.id, promise);
  try {
    const value = await promise;
    cachedByArea.set(location.id, {
      value,
      expiresAt: Date.now() + WBGT_CACHE_MS,
    });
    return value;
  } finally {
    if (inFlightByArea.get(location.id) === promise) {
      inFlightByArea.delete(location.id);
    }
  }
}

export async function GET(request: NextRequest) {
  const areaId = request.nextUrl.searchParams.get("area");
  const location = areaId ? getSignageLocationById(areaId) : undefined;
  if (!location) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message:
            "検証済みの区域IDを確認できません。候補から地域を選び直してください。",
          retryable: false,
        },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const limited = await sharedRateLimitGuard(
    request,
    {
      routeKey: "wbgt-read",
      limit: 120,
      windowMs: 10 * 60 * 1_000,
    },
    { previewGlobalSubject: true },
  );
  if (limited) return limited;

  const status = await loadWithSingleFlight(location);
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
      "x-wbgt-source": "environment-ministry",
    },
  });
}
