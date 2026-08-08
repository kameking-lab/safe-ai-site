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
import {
  createMockAccidentService,
  type AccidentService,
} from "@/lib/services/accident-service";
import { createOperationsService, type OperationsService } from "@/lib/services/operations-service";
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
  accident: AccidentService;
  operations: OperationsService;
};

function resolveApiMode(): ApiMode {
  if (process.env.NEXT_PUBLIC_API_MODE === "live") return "live";
  if (
    process.env.NEXT_PUBLIC_API_MODE === "mock" &&
    process.env.NODE_ENV !== "production"
  ) {
    return "mock";
  }
  // 本番の未設定をsyntheticデータへfail-openさせない。
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
  const effectiveMode: ApiMode =
    process.env.NODE_ENV === "production" && mode === "mock" ? "live" : mode;
  const resolveErrorInjectionOptions = (): ServiceErrorInjectionOptions => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
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
    return fetch(url.toString(), {
      ...init,
      headers: nextHeaders,
    });
  };

  const revision =
    effectiveMode === "live" ? createApiRevisionService(scopedFetch) : createMockRevisionService();
  const summary = effectiveMode === "live" ? createApiSummaryService(scopedFetch) : createMockSummaryService();
  const chat = effectiveMode === "live" ? createApiChatService(scopedFetch) : createMockChatService();
  const weatherMode = resolveWeatherMode(effectiveMode);
  const weatherRisk =
    weatherMode === "live" ? createApiWeatherRiskService(scopedFetch) : createMockWeatherRiskService();
  const accident = createMockAccidentService();
  const operations = createOperationsService();

  return { mode: effectiveMode, revision, summary, chat, weatherRisk, accident, operations };
}
