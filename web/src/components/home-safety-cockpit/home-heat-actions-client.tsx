"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";

export function HomeHeatActionsClient({
  areaId,
  wbgt,
  allowKy,
}: {
  areaId: string;
  wbgt: EnvironmentWbgtStatus | null;
  allowKy: boolean;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [stagingKy, setStagingKy] = useState(false);
  const showRefresh =
    !allowKy || wbgt?.degraded === true || wbgt?.wbgt.stale === true;

  const openKy = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setStagingKy(true);
    try {
      const [{ combineKyWeatherPayloads }, handoff] = await Promise.all([
        import("@/lib/ky/weather-prefill-v2"),
        import("@/lib/ky/handoff"),
      ]);
      const weather = combineKyWeatherPayloads({
        areaId,
        weather: null,
        wbgt,
      });
      const staged = handoff.writeKyHandoff(
        handoff.createKyHandoffPayload({
          source: "heat",
          areaId,
          ...(weather ? { weather } : {}),
          hazardIds: ["heat-illness"],
        }),
      );
      if (staged) {
        router.push("/ky/paper");
        return;
      }
    } catch {
      // The normal KY page remains available without a prefill.
    }
    window.location.assign("/ky/paper");
  };

  return (
    <>
      {allowKy ? (
      <a
        href="/ky/paper"
        onClick={(event) => void openKy(event)}
        aria-busy={stagingKy || undefined}
        data-primary-action="true"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-emerald-800 bg-white px-4 py-2 text-sm font-black text-emerald-900"
      >
        {stagingKy ? "KYを準備中" : "この暑さでKYを作る"}
      </a>
      ) : null}
      {showRefresh ? (
        <button
          type="button"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-wait disabled:opacity-60"
        >
          {refreshing ? "更新中" : "再取得"}
        </button>
      ) : null}
    </>
  );
}
