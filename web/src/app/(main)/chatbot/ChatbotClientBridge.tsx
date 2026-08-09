"use client";

import { useEffect } from "react";
import { ChatbotPanel } from "@/components/chatbot-panel";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import { useTransientQueryBridge } from "@/components/home-safety-cockpit/transient-query-bridge";

export function ChatbotClientBridge() {
  const copilot = useOptionalCopilot();
  const recordVisit = copilot?.recordVisit;
  const { peekChatQuestion, consumeChatQuestion, discardChatQuestion } =
    useTransientQueryBridge();
  const pendingChatQuestion = peekChatQuestion();

  useEffect(() => {
    recordVisit?.("chatbot");
  }, [recordVisit]);

  return (
    <ChatbotPanel
      initialQuestion={pendingChatQuestion?.question}
      onInitialQuestionConsumed={() => {
        if (!pendingChatQuestion) return;
        consumeChatQuestion(pendingChatQuestion.id);
      }}
      onInitialQuestionRejected={() => {
        if (pendingChatQuestion) {
          discardChatQuestion(pendingChatQuestion.id);
        }
      }}
    />
  );
}
