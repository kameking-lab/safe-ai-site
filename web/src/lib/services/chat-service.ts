import { buildMockChatReply } from "@/data/mock/chat-responses";
import type {
  ChatApiRequest,
  ChatApiResponse,
  ServiceError,
  ServiceResult,
} from "@/lib/types/api";
import type { ChatMessage, LawRevision } from "@/lib/types/domain";

export type SendChatMessageInput = {
  revision: LawRevision | null;
  question: string;
};

export type ChatService = {
  createInitialMessages: () => ChatMessage[];
  sendMessage: (input: SendChatMessageInput) => Promise<ServiceResult<ChatMessage>>;
};

function createInitialMessages(): ChatMessage[] {
  return [
    {
      id: "assistant-initial",
      role: "assistant",
      content: "質問を入力すると、選択中の法改正に沿ったダミー回答を表示します。",
    },
  ];
}

function createMessage(content: string): ChatMessage {
  return {
    id: `assistant-${Date.now() + 1}`,
    role: "assistant",
    content,
  };
}

function toApiRequest(input: SendChatMessageInput): ChatApiRequest {
  return {
    revisionId: input.revision?.id ?? "",
    revisionTitle: input.revision?.title ?? "選択中の法改正",
    question: input.question.trim(),
  };
}

function mapToError(
  code: ServiceError["code"],
  message: string,
  retryable: boolean
): ServiceError {
  return { code, message, retryable };
}

export function createMockChatService(): ChatService {
  return {
    createInitialMessages,
    async sendMessage(input) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const request = toApiRequest(input);
      if (!request.question) {
        return {
          ok: false,
          error: mapToError("VALIDATION", "質問文を入力してください。", false),
        };
      }

      const reply = buildMockChatReply(request.revisionTitle, request.question);

      return {
        ok: true,
        data: createMessage(reply),
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

  async sendMessage(input: SendChatMessageInput): Promise<ServiceResult<ChatMessage>> {
    try {
      const request = toApiRequest(input);
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: mapToError(
            "NETWORK",
            "チャットの取得に失敗しました。時間をおいて再試行してください。",
            true
          ),
        };
      }

      const payload = (await response.json()) as ChatApiResponse;
      return {
        ok: true,
        data: createMessage(payload.reply),
      };
    } catch {
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
