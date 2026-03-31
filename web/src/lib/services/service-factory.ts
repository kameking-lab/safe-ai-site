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
import type { ApiMode } from "@/lib/types/api";

export type AppServices = {
  mode: ApiMode;
  revision: RevisionService;
  summary: SummaryService;
  chat: ChatService;
};

function resolveApiMode(): ApiMode {
  // 将来、NEXT_PUBLIC_API_MODE=live で本番接続へ切替できる設計。
  return process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
}

export function createServices(mode: ApiMode = resolveApiMode()): AppServices {
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

    const current = new URL(window.location.href);
    const passThroughForceError = current.searchParams.get("forceRevisionsError");
    if (passThroughForceError && url.pathname === "/api/revisions") {
      url.searchParams.set("forceError", passThroughForceError);
    }

    return fetch(url.toString(), init);
  };

  const revision =
    mode === "live" ? createApiRevisionService(scopedFetch) : createMockRevisionService();
  const summary = mode === "live" ? createApiSummaryService(scopedFetch) : createMockSummaryService();
  const chat = mode === "live" ? createApiChatService(scopedFetch) : createMockChatService();

  return { mode, revision, summary, chat };
}
