import { createApiChatService, createMockChatService, type ChatService } from "@/lib/services/chat-service";
import {
  createApiRevisionService,
  createMockRevisionService,
  type RevisionService,
} from "@/lib/services/revision-service";
import {
  createApiSummaryService,
  createMockSummaryService,
  type SummaryService,
} from "@/lib/services/summary-service";
import {
  createApiWeatherRiskService,
  createMockWeatherRiskService,
  type WeatherRiskService,
} from "@/lib/services/weather-risk-service";
import type {
  ApiMode,
  ApiForceErrorType,
  ForceErrorTransport,
  ServiceErrorInjectionOptions,
} from "@/lib/types/api";

export type AppServices = {
  mode: ApiMode;
  revision: RevisionService;
  summary: SummaryService;
  chat: ChatService;
  weatherRisk: WeatherRiskService;
};

function resolveApiMode(): ApiMode {
  // 将来、NEXT_PUBLIC_API_MODE=live で本番接続へ切替できる設計。
  return process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
}

function resolveWeatherMode(defaultMode: ApiMode): ApiMode {
  const override = process.env.NEXT_PUBLIC_WEATHER_API_MODE;
  if (override === "live" || override === "mock") {
    return override;
  }
  return defaultMode;
}

function toForceErrorType(value: string | null | undefined): ApiForceErrorType | undefined {
  if (value === "5xx" || value === "timeout" || value === "validation") {
    return value;
  }
  return undefined;
}

function toForceErrorTransport(value: string | null | undefined): ForceErrorTransport | undefined {
  if (value === "query" || value === "header") {
    return value;
  }
  return undefined;
}

export function createServices(mode: ApiMode = resolveApiMode()): AppServices {
  const resolveErrorInjectionOptions = (): ServiceErrorInjectionOptions => {
    if (typeof window === "undefined") {
      return {};
    }
    const current = new URL(window.location.href);
    const envTransport = toForceErrorTransport(process.env.NEXT_PUBLIC_FORCE_ERROR_TRANSPORT);
    const queryTransport = toForceErrorTransport(current.searchParams.get("forceErrorTransport"));
    const transport = queryTransport ?? envTransport ?? "query";
    const useHeader = transport === "header";

    return {
      revisions: toForceErrorType(current.searchParams.get("forceRevisionsError")),
      summaries: toForceErrorType(current.searchParams.get("forceSummaryError")),
      chat: toForceErrorType(current.searchParams.get("forceChatError")),
      summaryDelayMs: current.searchParams.get("forceSummaryDelayMs") ?? undefined,
      chatDelayMs: current.searchParams.get("forceChatDelayMs") ?? undefined,
      revisionsDelayMs: current.searchParams.get("forceRevisionsDelayMs") ?? undefined,
      useHeaderTransport: useHeader,
      envForceError: toForceErrorType(process.env.NEXT_PUBLIC_FORCE_ERROR),
    };
  };

  const resolveIngestOptions = () => {
    if (typeof window === "undefined") {
      return {
        ingestSource: undefined as "sample" | "real" | undefined,
        realSourcePayload: undefined as string | undefined,
      };
    }
    const current = new URL(window.location.href);
    const ingestSource = current.searchParams.get("ingestSource");
    return {
      ingestSource: ingestSource === "real" ? "real" : ingestSource === "sample" ? "sample" : undefined,
      realSourcePayload: current.searchParams.get("realSourcePayload") ?? undefined,
      realSourceFormat: current.searchParams.get("realSourceFormat") ?? undefined,
      realSourceUrl: current.searchParams.get("realSourceUrl") ?? undefined,
    };
  };

  const scopedFetch: typeof fetch = (input, init) => {
    if (typeof window === "undefined") {
      return fetch(input, init);
    }
    const url =
      typeof input === "string"
        ? new URL(input, window.location.origin)
        : input instanceof URL
          ? new URL(input.toString())
          : new URL(input.url);

    const options = resolveErrorInjectionOptions();
    const ingestOptions = resolveIngestOptions();
    const sharedForceError = options.envForceError;
    const useHeaderTransport = options.useHeaderTransport === true;
    const nextHeaders = new Headers(init?.headers);

    const passThroughForceError = options.revisions ?? sharedForceError;
    if (passThroughForceError && url.pathname === "/api/revisions") {
      if (useHeaderTransport) {
        nextHeaders.set("x-force-error", passThroughForceError);
      } else {
        url.searchParams.set("forceError", passThroughForceError);
      }
    }
    const passThroughSummaryError = options.summaries ?? sharedForceError;
    if (passThroughSummaryError && url.pathname === "/api/summaries") {
      if (useHeaderTransport) {
        nextHeaders.set("x-force-error", passThroughSummaryError);
      } else {
        url.searchParams.set("forceError", passThroughSummaryError);
      }
    }
    const passThroughChatError = options.chat ?? sharedForceError;
    if (passThroughChatError && url.pathname === "/api/chat") {
      if (useHeaderTransport) {
        nextHeaders.set("x-force-error", passThroughChatError);
      } else {
        url.searchParams.set("forceError", passThroughChatError);
      }
    }
    const passThroughSummaryDelay = options.summaryDelayMs;
    if (passThroughSummaryDelay && url.pathname === "/api/summaries") {
      url.searchParams.set("delayMs", passThroughSummaryDelay);
    }
    const passThroughChatDelay = options.chatDelayMs;
    if (passThroughChatDelay && url.pathname === "/api/chat") {
      url.searchParams.set("delayMs", passThroughChatDelay);
    }
    const passThroughRevisionsDelay = options.revisionsDelayMs;
    if (passThroughRevisionsDelay && url.pathname === "/api/revisions") {
      url.searchParams.set("delayMs", passThroughRevisionsDelay);
    }
    if (url.pathname === "/api/revisions") {
      if (ingestOptions.ingestSource) {
        url.searchParams.set("ingestSource", ingestOptions.ingestSource);
      }
      if (ingestOptions.realSourcePayload) {
        url.searchParams.set("realSourcePayload", ingestOptions.realSourcePayload);
      }
      if (ingestOptions.realSourceFormat) {
        url.searchParams.set("realSourceFormat", ingestOptions.realSourceFormat);
      }
      if (ingestOptions.realSourceUrl) {
        url.searchParams.set("realSourceUrl", ingestOptions.realSourceUrl);
      }
    }

    return fetch(url.toString(), {
      ...init,
      headers: nextHeaders,
    });
  };

  const revision =
    mode === "live" ? createApiRevisionService(scopedFetch) : createMockRevisionService();
  const summary = mode === "live" ? createApiSummaryService(scopedFetch) : createMockSummaryService();
  const chat = mode === "live" ? createApiChatService(scopedFetch) : createMockChatService();
  const weatherMode = resolveWeatherMode(mode);
  const weatherRisk =
    weatherMode === "live" ? createApiWeatherRiskService(scopedFetch) : createMockWeatherRiskService();

  return { mode, revision, summary, chat, weatherRisk };
}
