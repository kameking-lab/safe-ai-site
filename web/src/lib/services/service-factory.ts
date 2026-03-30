import {
  ApiChatService,
  createMockChatService,
  type ChatService,
} from "@/lib/services/chat-service";
import {
  createApiRevisionService,
  createMockRevisionService,
  type RevisionService,
} from "@/lib/services/revision-service";
import {
  ApiSummaryService,
  createMockSummaryService,
  type SummaryService,
} from "@/lib/services/summary-service";
import type { ApiMode } from "@/lib/types/api";

export type AppServices = {
  revision: RevisionService;
  summary: SummaryService;
  chat: ChatService;
};

function resolveApiMode(): ApiMode {
  // 将来、NEXT_PUBLIC_API_MODE=live で本番接続へ切替できる設計。
  return process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
}

export function createServices(mode: ApiMode = resolveApiMode()): AppServices {
  const revision = mode === "live" ? createApiRevisionService(fetch) : createMockRevisionService();
  const summary = mode === "live" ? new ApiSummaryService(fetch) : createMockSummaryService();
  const chat = mode === "live" ? new ApiChatService(fetch) : createMockChatService();

  return { revision, summary, chat };
}
