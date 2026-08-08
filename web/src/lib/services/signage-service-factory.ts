import {
  createApiRevisionService,
  createMockRevisionService,
  type RevisionService,
} from "@/lib/services/revision-service";
import {
  createApiWeatherRiskService,
  createMockWeatherRiskService,
  type WeatherRiskService,
} from "@/lib/services/weather-risk-service";
import type {
  ApiForceErrorType,
  ApiMode,
  ForceErrorTransport,
} from "@/lib/types/api";

export type SignageServices = {
  mode: ApiMode;
  revision: RevisionService;
  weatherRisk: WeatherRiskService;
};

function resolveMode(): ApiMode {
  if (process.env.NEXT_PUBLIC_API_MODE === "live") return "live";
  if (
    process.env.NEXT_PUBLIC_API_MODE === "mock" &&
    process.env.NODE_ENV !== "production"
  ) {
    return "mock";
  }
  return process.env.NODE_ENV === "production" ? "live" : "mock";
}

function resolveWeatherMode(defaultMode: ApiMode): ApiMode {
  const override = process.env.NEXT_PUBLIC_WEATHER_API_MODE;
  if (
    override === "live" ||
    (override === "mock" && process.env.NODE_ENV !== "production")
  ) {
    return override;
  }
  return defaultMode;
}

function forceError(value: string | null | undefined): ApiForceErrorType | undefined {
  return value === "5xx" || value === "timeout" || value === "validation"
    ? value
    : undefined;
}

function forceTransport(
  value: string | null | undefined,
): ForceErrorTransport | undefined {
  return value === "query" || value === "header" ? value : undefined;
}

/**
 * サイネージが必要とする気象・法改正だけを組み立てる。
 * 全機能向けfactory（chat/summary/事故/帳票）を常時表示画面へ同梱しない。
 */
export function createSignageServices(
  requestedMode: ApiMode = resolveMode(),
): SignageServices {
  const mode =
    process.env.NODE_ENV === "production" && requestedMode === "mock"
      ? "live"
      : requestedMode;

  const scopedFetch: typeof fetch = (input, init) => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
      return fetch(input, init);
    }
    const url =
      typeof input === "string"
        ? new URL(input, window.location.origin)
        : input instanceof URL
          ? new URL(input.toString())
          : new URL(input.url);
    const current = new URL(window.location.href);
    const transport =
      forceTransport(current.searchParams.get("forceErrorTransport")) ??
      forceTransport(process.env.NEXT_PUBLIC_FORCE_ERROR_TRANSPORT) ??
      "query";
    const injected =
      forceError(current.searchParams.get("forceRevisionsError")) ??
      forceError(process.env.NEXT_PUBLIC_FORCE_ERROR);
    const delay = current.searchParams.get("forceRevisionsDelayMs");
    const headers = new Headers(init?.headers);

    if (url.pathname === "/api/revisions") {
      if (injected) {
        if (transport === "header") headers.set("x-force-error", injected);
        else url.searchParams.set("forceError", injected);
      }
      if (delay) url.searchParams.set("delayMs", delay);
    }

    return fetch(url.toString(), { ...init, headers });
  };

  const revision =
    mode === "live"
      ? createApiRevisionService(scopedFetch)
      : createMockRevisionService();
  const weatherMode = resolveWeatherMode(mode);
  const weatherRisk =
    weatherMode === "live"
      ? createApiWeatherRiskService(scopedFetch)
      : createMockWeatherRiskService();

  return { mode, revision, weatherRisk };
}
