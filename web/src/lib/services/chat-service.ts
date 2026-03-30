import { buildMockChatReply } from "@/data/mock/chat-responses";
import type { ChatMessage, LawRevision } from "@/lib/types/domain";

export function createInitialChatMessages(): ChatMessage[] {
  return [
    {
      id: "assistant-initial",
      role: "assistant",
      content: "質問を入力すると、選択中の法改正に沿ったダミー回答を表示します。",
    },
  ];
}

export function createChatResponse(params: {
  revision: LawRevision | null;
  question: string;
}): ChatMessage {
  const revisionTitle = params.revision?.title ?? "選択中の法改正";
  const responseText = buildMockChatReply(revisionTitle, params.question);

  return {
    id: `assistant-${Date.now() + 1}`,
    role: "assistant",
    content: responseText,
  };
}
