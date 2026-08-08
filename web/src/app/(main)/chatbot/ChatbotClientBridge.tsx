"use client";

import { useEffect } from "react";
import { ChatbotPanel } from "@/components/chatbot-panel";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import { useTransientQueryBridge } from "@/components/home-safety-cockpit/transient-query-bridge";
import {
  elapsedBucket,
  trackHomeCockpitEvent,
} from "@/lib/home-cockpit-telemetry";

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
        trackHomeCockpitEvent("home_chat_destination_ready", {
          action_type: "chat",
          destination_route_template: "/chatbot",
          elapsed_bucket: elapsedBucket(
            Date.now() - pendingChatQuestion.stagedAt,
          ),
        });
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
