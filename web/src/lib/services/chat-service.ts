import type {
  ApiForceErrorType,
  ApiErrorResponse,
  ChatApiRequest,
  ChatApiResponse,
  ServiceError,
  ServiceResult,
} from "@/lib/types/api";
import type { ChatMessage, LawRevision } from "@/lib/types/domain";
import type { LegalConversationContext } from "@/lib/legal-conversation-context";

export type SendChatMessageInput = {
  revision: LawRevision | null;
  question: string;
  privacyConfirmed: boolean;
  history?: ChatMessage[];
  context?: LegalConversationContext;
};

export type ChatService = {
  createInitialMessages: () => ChatMessage[];
  sendMessage: (
    input: SendChatMessageInput,
    options?: { forceError?: ApiForceErrorType; delayMs?: number }
  ) => Promise<ServiceResult<ChatMessage>>;
};

function createInitialMessages(): ChatMessage[] {
  return [
    {
      id: "assistant-initial",
      role: "assistant",
      content: "選択中の法改正について質問できます。",
    },
  ];
}

function createMessage(
  content: string,
  structured: Pick<
    ChatMessage,
    "conditions" | "clarificationQuestion" | "quickReplies" | "sources" | "context"
  > = {},
): ChatMessage {
  return {
    id: `assistant-${Date.now() + 1}`,
    role: "assistant",
    content,
    ...structured,
  };
}

function toApiRequest(input: SendChatMessageInput): ChatApiRequest {
  const history = (input.history ?? [])
    .filter(
      (message) =>
        message.role === "user" &&
        message.content.trim().length > 0 &&
        message.content.length <= 4_000,
    )
    .slice(-10)
    .map((message) => ({ role: message.role, content: message.content.trim() }));
  return {
    revisionId: input.revision?.id ?? "",
    revisionTitle: input.revision?.title ?? "選択中の法改正",
    question: input.question.trim(),
    privacyConfirmed: input.privacyConfirmed,
    ...(history.length > 0 ? { history } : {}),
    ...(input.context ? { context: input.context } : {}),
  };
}

function mapToError(
  code: ServiceError["code"],
  message: string,
  retryable: boolean
): ServiceError {
  return { code, message, retryable };
}

const REQUEST_TIMEOUT_MS = 4000;

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createMockChatService(): ChatService {
  return {
    createInitialMessages,
    async sendMessage(_: SendChatMessageInput): Promise<ServiceResult<ChatMessage>> {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        ok: true,
        data: createMessage(
          "この法改正は現場の安全管理に影響します。詳細は法令原文と厚生労働省ガイドラインをご確認ください。"
        ),
      };
    },
  };
}

export class ApiChatService implements ChatService {
  constructor(
    private readonly fetchImpl: typeof fetch,
    private readonly endpoint = "/api/chat"
  ) {}

  createInitialMessages() {
    return createInitialMessages();
  }

  async sendMessage(
    input: SendChatMessageInput,
    options?: { forceError?: ApiForceErrorType; delayMs?: number }
  ): Promise<ServiceResult<ChatMessage>> {
    try {
      const request = toApiRequest(input);
      const url = new URL(this.endpoint, "http://localhost");
      if (options?.forceError) {
        url.searchParams.set("forceError", options.forceError);
      }
      if (typeof options?.delayMs === "number") {
        url.searchParams.set("delayMs", String(options.delayMs));
      }
      const target = this.endpoint.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;

      const response = await fetchWithTimeout(this.fetchImpl, target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        if (errorBody?.error) {
          return {
            ok: false,
            error: {
              ...errorBody.error,
              retryable: errorBody.error.retryable ?? response.status >= 500,
            },
          };
        }
        return {
          ok: false,
          error: mapToError(
            response.status >= 500 ? "UNAVAILABLE" : "NETWORK",
            response.status >= 500
              ? "チャットAPIが一時的に利用できません。時間をおいて再試行してください。"
              : "チャットの取得に失敗しました。時間をおいて再試行してください。",
            true
          ),
        };
      }

      const payload = (await response.json()) as ChatApiResponse;
      return {
        ok: true,
        data: createMessage(
          payload.substantiveAnswer?.trim() || payload.reply,
          {
            conditions: payload.conditions?.slice(0, 3),
            clarificationQuestion: payload.clarificationQuestion,
            quickReplies: payload.quickReplies?.slice(0, 3),
            sources: payload.sources,
            context: payload.context,
          },
        ),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: mapToError("NETWORK", "チャット応答がタイムアウトしました。再試行してください。", true),
        };
      }
      return {
        ok: false,
        error: mapToError("UNKNOWN", "チャット応答の取得中に予期しないエラーが発生しました。", true),
      };
    }
  }
}

export function createApiChatService(
  fetchImpl: typeof fetch = fetch,
  endpoint?: string
): ChatService {
  return new ApiChatService(fetchImpl, endpoint);
}
