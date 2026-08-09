"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw, Send, Square, X } from "lucide-react";
import type {
  ChatbotQuickReply,
  ChatbotResponse,
  ChatbotSource,
  FollowupSuggestion,
} from "@/lib/chatbot-contract";
import type { NoticeHit } from "@/lib/notice-search";
import type {
  DigDeeperLink,
  RelatedLawLink,
  StructuredCitation,
} from "@/lib/chatbot-enrichment";
import type {
  AttachedLeaflet,
  AttachedNotice,
} from "@/lib/chatbot-notice-attachment";
import type { LawCategoryFilter } from "@/lib/law-category-options";
import { VoiceMicButton } from "@/components/voice-input-field";
import { clearChatHistory } from "@/lib/chat-history";
import { trackEvent } from "@/components/Analytics";
import { formatAnswerForDisplay } from "@/lib/chatbot-answer-format";
import {
  evaluateChatbotSafety,
  type ChatbotSafetyKind,
} from "@/lib/chatbot-safety";
import { inspectAiOutbound } from "@/lib/ai-outbound-safety";
import type { LegalClarification } from "@/lib/legal-conversation-context";
import {
  sanitizePublicLegalConversationContext,
  type PublicLegalConversationContext,
} from "@/lib/legal-conversation-public-context";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  directAnswer?: string;
  substantiveAnswer?: string;
  assumptions?: string[];
  importantConditions?: string[];
  conditions?: string[];
  sources?: ChatbotSource[];
  source_type?: "rag" | "ai_inference" | "safety";
  confidence?: "high" | "medium" | "low";
  confidenceScore?: number;
  followups?: FollowupSuggestion[];
  notices?: NoticeHit[];
  citations?: StructuredCitation[];
  relatedLaws?: RelatedLawLink[];
  digDeeperLinks?: DigDeeperLink[];
  scopeWarnings?: string[];
  attachedNotices?: AttachedNotice[];
  attachedLeaflets?: AttachedLeaflet[];
  safetyKind?: ChatbotSafetyKind;
  requiresHumanReview?: boolean;
  clarification?: LegalClarification;
  clarificationQuestion?: string | null;
  quickReplies?: ChatbotQuickReply[];
  effectiveDateStatus?: ChatbotResponse["effectiveDateStatus"];
};

type ChatbotResponsePayload = Partial<ChatbotResponse> & {
  /** 新契約を先に読み、旧契約名は移行期間だけfallbackとして扱う。 */
  directAnswer?: string;
  importantConditions?: string[];
};

const EXAMPLE_QUESTIONS = [
  "電気作業の資格は？",
  "フォークリフトの資格は？",
  "足場の手すりは？",
] as const;

function createMessage(
  role: ChatMessage["role"],
  content: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return { id: crypto.randomUUID(), role, content, ...extra };
}

function scrollConversation(ref: React.RefObject<HTMLDivElement | null>) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const node = ref.current;
    node?.scrollTo({
      top: node.scrollHeight,
      // Streaming can schedule several updates in quick succession. Jumping to
      // the committed end avoids stacked animations and keeps the latest answer
      // controls immediately reachable for keyboard and screen-reader users.
      behavior: "auto",
    });
  });
}

function displayAnswer(content: string): { visible: string; rest: string } {
  const formatted = formatAnswerForDisplay(content).trim();
  if (formatted.length <= 600) return { visible: formatted, rest: "" };
  const boundary = formatted.lastIndexOf("\n", 600);
  const end = boundary >= 420 ? boundary : 600;
  return {
    visible: `${formatted.slice(0, end).trimEnd()}…`,
    rest: formatted.slice(end).trim(),
  };
}

const PRESENTATION_ONLY_HEADING_RE =
  /^(?:\*\*)?(?:結論|条件(?:で変わる点)?|根拠|適用時点|確認|次の質問)(?:\*\*)?[：:]?$/;

function AnswerContent({ text, lead = false }: { text: string; lead?: boolean }) {
  const blocks = text
    .split(/\n\s*\n/u)
    .map((block) =>
      block
        .split("\n")
        .filter((line) => !PRESENTATION_ONLY_HEADING_RE.test(line.trim()))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <p
          key={`${index}-${block.slice(0, 24)}`}
          className={`whitespace-pre-wrap ${lead && index === 0 ? "font-semibold text-slate-950 dark:text-white" : ""}`}
        >
          {block}
        </p>
      ))}
    </div>
  );
}

function structuredConditions(message: ChatMessage): string[] {
  return [
    ...(message.importantConditions ?? message.conditions ?? []),
    ...(message.assumptions ?? []),
  ]
    .map((item) => item.trim())
    .filter(
      (item, index, items) =>
        Boolean(item) &&
        items.findIndex((candidate) => candidate === item) === index,
    )
    .slice(0, 3);
}

function quickRepliesFor(message: ChatMessage): ChatbotQuickReply[] {
  return (message.quickReplies ?? [])
    .filter((reply) => reply.label.trim() && reply.prompt.trim())
    .slice(0, 3);
}

export function ChatbotPanel({
  onSafetyStateChange,
  onTransferBlockedChange,
  initialQuestion,
  onInitialQuestionConsumed,
  onInitialQuestionRejected,
}: {
  onSafetyStateChange?: (kind: ChatbotSafetyKind | null) => void;
  onTransferBlockedChange?: (blocked: boolean) => void;
  initialQuestion?: string;
  onInitialQuestionConsumed?: () => void;
  onInitialQuestionRejected?: () => void;
} = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryableQuestion, setRetryableQuestion] = useState<string | null>(
    null,
  );
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [answerFeedback, setAnswerFeedback] = useState<
    Record<string, "matched" | "mismatched">
  >({});
  const [localSafetyNotice, setLocalSafetyNotice] = useState<{
    kind: "emergency" | "privacy";
    message: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestPendingRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const conversationContextRef = useRef<PublicLegalConversationContext>({});
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const previousInputValueRef = useRef(input);
  const initialQuestionConsumedRef = useRef(false);
  const lawCategory: LawCategoryFilter = "all";

  useEffect(() => {
    clearChatHistory();
  }, []);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const domValue = composer.value;
    const previousValue = previousInputValueRef.current;
    const submitAfterHydration =
      composer.dataset.chatbotPrehydrationSubmit === "true";
    composer.dataset.chatbotHydrated = "true";
    previousInputValueRef.current = input;

    const typedBeforeHydration =
      domValue !== previousValue && input === previousValue;
    if (typedBeforeHydration || submitAfterHydration) {
      const timer = window.setTimeout(() => {
        if (typedBeforeHydration) setInput(domValue);
        if (submitAfterHydration) {
          delete composer.dataset.chatbotPrehydrationSubmit;
          if (domValue.trim()) composer.form?.requestSubmit();
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (domValue !== input) composer.value = input;
  }, [input]);

  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const kind = localSafetyNotice?.kind ?? lastAssistant?.safetyKind ?? null;
    onSafetyStateChange?.(kind);
    onTransferBlockedChange?.(
      Boolean(localSafetyNotice || lastAssistant?.requiresHumanReview),
    );
  }, [
    localSafetyNotice,
    messages,
    onSafetyStateChange,
    onTransferBlockedChange,
  ]);

  async function handleSend(question?: string) {
    const text = (question ?? input).trim();
    if (!text || requestPendingRef.current) return;

    const safety = evaluateChatbotSafety(text);
    if (safety?.kind === "emergency" || safety?.kind === "privacy") {
      setLocalSafetyNotice({ kind: safety.kind, message: safety.response });
      setInput("");
      setError(null);
      setRetryableQuestion(null);
      return;
    }
    const outboundPreflight = inspectAiOutbound({
      purpose: "chatbot-client-preflight",
      texts: [text],
      consent: true,
      maxChars: 4_000,
      contextPolicy: "approved-server-corpus",
    });
    if (!outboundPreflight.allowed) {
      setLocalSafetyNotice({
        kind:
          outboundPreflight.reason === "emergency" ? "emergency" : "privacy",
        message: outboundPreflight.message,
      });
      setInput("");
      return;
    }

    requestPendingRef.current = true;
    const requestGeneration = ++requestGenerationRef.current;
    setIsSending(true);
    setError(null);
    setRetryableQuestion(null);
    setLocalSafetyNotice(null);
    setInput("");

    const userMessage = createMessage("user", text);
    const assistantId = crypto.randomUUID();
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      requiresHumanReview: true,
    };
    const nextMessages = [...messages, userMessage, placeholder];
    setMessages(nextMessages);
    scrollConversation(listRef);

    const controller = new AbortController();
    abortRef.current = controller;
    const requestBody = JSON.stringify({
      message: text,
      context: sanitizePublicLegalConversationContext(
        conversationContextRef.current,
      ),
      lawCategory,
      // The client and server have both run the same PII/emergency gate.
      privacyConfirmed: true,
    });
    let streamedContent = "";
    const timeoutId = window.setTimeout(
      () => controller.abort("timeout"),
      30_000,
    );

    try {
      const response = await fetch("/api/chatbot/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: controller.signal,
      });

      if (
        !response.ok &&
        (response.status === 422 || response.status === 428)
      ) {
        const blocked = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        setMessages((previous) =>
          previous.filter(
            (message) =>
              message.id !== userMessage.id && message.id !== assistantId,
          ),
        );
        setLocalSafetyNotice({
          kind: "privacy",
          message:
            blocked?.message ??
            blocked?.error ??
            "個人情報を除いて、もう一度入力してください。",
        });
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error("response-unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalMeta: ChatbotResponsePayload = {};

      while (true) {
        const { done, value } = await reader.read();
        if (requestGenerationRef.current !== requestGeneration) {
          await reader.cancel().catch(() => undefined);
          return;
        }
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let separator = buffer.indexOf("\n\n");
        while (separator >= 0) {
          const frame = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          const lines = frame.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (data) {
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              if (event === "text" && typeof parsed.chunk === "string") {
                streamedContent += parsed.chunk;
                setMessages((previous) =>
                  previous.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: streamedContent }
                      : message,
                  ),
                );
                scrollConversation(listRef);
              } else if (event === "meta") {
                finalMeta = parsed as ChatbotResponsePayload;
              } else if (event === "error") {
                throw new Error("stream-error");
              }
            } catch (parseError) {
              if (
                parseError instanceof Error &&
                parseError.message === "stream-error"
              ) {
                throw parseError;
              }
            }
          }
          separator = buffer.indexOf("\n\n");
        }
      }

      const directAnswer =
        finalMeta.directAnswer?.trim() ||
        finalMeta.substantiveAnswer?.trim() ||
        "";
      if (!directAnswer && !finalMeta.answer?.trim()) {
        throw new Error("stream-incomplete");
      }

      conversationContextRef.current = sanitizePublicLegalConversationContext(
        finalMeta.context,
      );

      trackEvent("chatbot_message", { message_length: text.length });
      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: finalMeta.answer ?? directAnswer ?? streamedContent,
                directAnswer: finalMeta.directAnswer,
                substantiveAnswer: finalMeta.substantiveAnswer,
                assumptions: finalMeta.assumptions,
                importantConditions: finalMeta.importantConditions,
                conditions: finalMeta.conditions,
                sources: finalMeta.sources,
                source_type: finalMeta.source_type,
                confidence: finalMeta.confidence,
                confidenceScore: finalMeta.confidenceScore,
                followups: finalMeta.followups,
                notices: finalMeta.notices,
                citations: finalMeta.citations,
                relatedLaws: finalMeta.relatedLaws,
                digDeeperLinks: finalMeta.digDeeperLinks,
                scopeWarnings: finalMeta.scopeWarnings,
                attachedNotices: finalMeta.attachedNotices,
                attachedLeaflets: finalMeta.attachedLeaflets,
                safetyKind: finalMeta.safetyKind,
                clarification: finalMeta.clarification,
                clarificationQuestion: finalMeta.clarificationQuestion,
                quickReplies: finalMeta.quickReplies,
                effectiveDateStatus: finalMeta.effectiveDateStatus,
                requiresHumanReview: finalMeta.requiresHumanReview ?? true,
              }
            : message,
        ),
      );
    } catch (streamError) {
      if (requestGenerationRef.current !== requestGeneration) return;
      setMessages((previous) =>
        previous.filter(
          (message) =>
            message.id !== userMessage.id && message.id !== assistantId,
        ),
      );
      if (
        controller.signal.aborted ||
        (streamError instanceof Error && streamError.name === "AbortError")
      ) {
        setError(
          controller.signal.reason === "timeout"
            ? "回答がタイムアウトしました。再試行できます。"
            : "応答を停止しました。再試行できます。",
        );
      } else {
        setError("回答を取得できませんでした。自動再送はしていません。");
      }
      setRetryableQuestion(text);
      if (streamError instanceof Error) {
        console.warn("[chatbot] request failed", { kind: streamError.name });
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (requestGenerationRef.current === requestGeneration) {
        requestPendingRef.current = false;
        setIsSending(false);
        abortRef.current = null;
        scrollConversation(listRef);
      }
    }
  }

  useEffect(() => {
    if (
      initialQuestionConsumedRef.current ||
      !initialQuestion ||
      !initialQuestion.trim()
    ) {
      return;
    }
    initialQuestionConsumedRef.current = true;
    const question = initialQuestion.trim();
    onInitialQuestionConsumed?.();
    void handleSend(question).catch(() => onInitialQuestionRejected?.());
    // The one-shot handoff is consumed before network access and passes the
    // same local and server safety gates as typed input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const handleCopy = useCallback(async (id: string, content: string) => {
    const formatted = formatAnswerForDisplay(content);
    let copied = false;
    try {
      await navigator.clipboard.writeText(formatted);
      copied = true;
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = formatted;
      fallback.setAttribute("readonly", "");
      fallback.className = "fixed left-[-9999px] top-0";
      document.body.appendChild(fallback);
      fallback.select();
      copied = document.execCommand?.("copy") ?? false;
      fallback.remove();
    }
    if (!copied) return;
    setCopyStates((previous) => ({ ...previous, [id]: true }));
    window.setTimeout(
      () => setCopyStates((previous) => ({ ...previous, [id]: false })),
      1_500,
    );
  }, []);

  function handleClear() {
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    requestPendingRef.current = false;
    setIsSending(false);
    conversationContextRef.current = {};
    setMessages([]);
    setInput("");
    setError(null);
    setRetryableQuestion(null);
    setLocalSafetyNotice(null);
    setAnswerFeedback({});
    clearChatHistory();
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const activeReplyMessage =
    !isSending &&
    lastMessage?.role === "assistant" &&
    quickRepliesFor(lastMessage).length > 0
      ? lastMessage
      : null;
  const completedAnswerCount = messages.filter(
    (message) => message.role === "assistant" && message.content.trim(),
  ).length;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"
      aria-label="安衛法AIとの会話"
      aria-busy={isSending}
      data-ui-box={isEmpty ? "" : undefined}
      data-chatbot-panel-state={isEmpty ? "empty" : "conversation"}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-chatbot-live-region=""
      >
        {completedAnswerCount > 0
          ? `安衛法AIの回答 ${completedAnswerCount} を表示しました。`
          : ""}
      </div>
      {(messages.length > 0 || localSafetyNotice) && (
        <div className="flex min-h-11 items-center justify-end border-b border-slate-100 px-3 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            新しい相談
          </button>
        </div>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4"
        role="log"
        aria-live="off"
        aria-relevant="additions text"
        aria-label="会話履歴"
        data-chatbot-history=""
      >
        {isEmpty ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              質問例
            </p>
            <div
              className="flex w-full flex-wrap justify-center gap-2"
              role="group"
              aria-label="質問例"
            >
              {EXAMPLE_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  data-chatbot-question-chip=""
                  disabled={isSending}
                  onClick={() => void handleSend(question)}
                  className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-4 text-slate-700 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message, index) => {
              const assistantAnswerNumber =
                message.role === "assistant"
                  ? messages
                      .slice(0, index + 1)
                      .filter((item) => item.role === "assistant").length
                  : 0;
              const isStreaming =
                message.role === "assistant" &&
                isSending &&
                index === messages.length - 1;
              const hasStructuredAnswer = Boolean(
                message.role === "assistant" &&
                (message.directAnswer?.trim() ||
                  message.substantiveAnswer?.trim()),
              );
              const directAnswer =
                message.role === "assistant"
                  ? (message.directAnswer?.trim() ||
                    message.substantiveAnswer?.trim() ||
                    "")
                  : "";
              const answer =
                message.role === "assistant" && !hasStructuredAnswer
                  ? displayAnswer(message.content)
                  : null;
              const conditionItems =
                message.role === "assistant"
                  ? structuredConditions(message)
                  : [];
              const clarificationQuestion =
                message.role === "assistant"
                  ? (message.clarificationQuestion ??
                    message.clarification?.question ??
                    null)
                  : null;
              const quickReplies =
                message.role === "assistant" ? quickRepliesFor(message) : [];
              const scopeWarnings =
                message.role === "assistant"
                  ? (message.scopeWarnings ?? [])
                      .map((warning) => warning.trim())
                      .filter(Boolean)
                      .slice(0, 3)
                  : [];
              const hasEvidence =
                message.role === "assistant" &&
                ((message.sources?.length ?? 0) > 0 ||
                  (message.citations?.length ?? 0) > 0 ||
                  (message.attachedNotices?.length ?? 0) > 0 ||
                  (message.attachedLeaflets?.length ?? 0) > 0);
              return (
                <article
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[88%]"
                      : "max-w-2xl"
                  }
                  aria-label={
                    message.role === "user" ? "あなたの質問" : "安衛法AIの回答"
                  }
                  data-chatbot-answer={
                    message.role === "assistant" ? "" : undefined
                  }
                >
                  {message.role === "user" ? (
                    <p className="rounded-2xl rounded-br-md bg-blue-700 px-4 py-2.5 text-sm leading-6 text-white">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm leading-7 text-slate-900 dark:text-slate-100">
                      <h2
                        id={`chatbot-answer-heading-${message.id}`}
                        className="sr-only"
                      >
                        安衛法AIの回答 {assistantAnswerNumber}
                      </h2>
                      {hasStructuredAnswer ? (
                        <div
                          className="space-y-3"
                          data-chatbot-structured-answer=""
                        >
                          <AnswerContent text={directAnswer} lead />
                          {conditionItems.length > 0 && (
                            <ul
                              className="space-y-1 pl-5 text-slate-800 dark:text-slate-200"
                              aria-label="主な条件"
                            >
                              {conditionItems.map((condition) => (
                                <li key={condition} className="list-disc">
                                  {condition}
                                </li>
                              ))}
                            </ul>
                          )}
                          {clarificationQuestion && (
                            <p data-chatbot-clarification-question="">
                              {clarificationQuestion}
                            </p>
                          )}
                        </div>
                      ) : answer?.visible ? (
                        <AnswerContent text={answer.visible} />
                      ) : (
                        <span className="sr-only">回答を作成中</span>
                      )}
                      {answer?.rest && (
                        <details className="mt-2 text-sm">
                          <summary className="min-h-11 cursor-pointer py-2 font-medium text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-blue-300">
                            詳しく読む
                          </summary>
                          <div className="pb-1 text-slate-700 dark:text-slate-300">
                            <AnswerContent text={answer.rest} />
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {message.role === "assistant" &&
                    !isStreaming &&
                    scopeWarnings.length > 0 && (
                      <aside
                        role="note"
                        aria-label="確認が必要"
                        data-chatbot-scope-warning=""
                        className="mt-3 border-l-2 border-amber-400 pl-3 text-xs leading-5 text-amber-950 dark:text-amber-100"
                      >
                        <p className="font-semibold">確認が必要</p>
                        <ul className="mt-1 space-y-1">
                          {scopeWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </aside>
                    )}

                  {message.role === "assistant" &&
                    message.id === activeReplyMessage?.id &&
                    answerFeedback[message.id] !== "mismatched" &&
                    quickReplies.length > 0 && (
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        role="group"
                        aria-label="確認する条件"
                      >
                        {quickReplies.map((reply) => (
                          <button
                            key={`${reply.label}-${reply.prompt}`}
                            type="button"
                            data-chatbot-question-chip=""
                            data-chatbot-quick-reply=""
                            onClick={() => void handleSend(reply.prompt)}
                            className="min-h-11 max-w-full whitespace-normal rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold leading-4 text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          >
                            {reply.label}
                          </button>
                        ))}
                      </div>
                    )}

                  {message.role === "assistant" &&
                    !isStreaming &&
                    hasEvidence && <SourceDetails message={message} />}

                  {message.role === "assistant" && !isStreaming && (
                    <div
                      className="mt-2 flex min-h-11 items-center gap-3"
                      data-chatbot-answer-actions=""
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(
                            message.id,
                            message.directAnswer ??
                              message.substantiveAnswer ??
                              message.content,
                          )
                        }
                        className="inline-flex min-h-11 items-center gap-1 px-1 text-xs font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-slate-400 dark:hover:text-white"
                      >
                        {copyStates[message.id] ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {copyStates[message.id] ? "コピー済み" : "コピー"}
                      </button>
                      {!message.safetyKind &&
                        !(answer?.rest && hasEvidence) && (
                          <button
                            type="button"
                            onClick={() => composerRef.current?.focus()}
                            className="min-h-11 px-1 text-xs font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-slate-400 dark:hover:text-white"
                          >
                            条件を追加
                          </button>
                        )}
                    </div>
                  )}

                  {message.role === "assistant" &&
                    !isStreaming &&
                    !message.safetyKind && (
                      <div
                        className="mt-1 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
                        data-chatbot-answer-feedback=""
                      >
                        <p
                          id={`chatbot-feedback-label-${message.id}`}
                          className="leading-5"
                        >
                          {answerFeedback[message.id] === "mismatched"
                            ? "知りたい点をもう少し教えてください"
                            : answerFeedback[message.id] === "matched"
                              ? "ありがとうございます。"
                              : "質問の意図に合っていましたか？"}
                        </p>
                        <div
                          className="mt-1 flex flex-wrap gap-x-3"
                          role="group"
                          aria-labelledby={`chatbot-feedback-label-${message.id}`}
                        >
                          <button
                            type="button"
                            aria-pressed={
                              answerFeedback[message.id] === "matched"
                            }
                            onClick={() =>
                              setAnswerFeedback((current) => ({
                                ...current,
                                [message.id]: "matched",
                              }))
                            }
                            className="min-h-11 px-1 font-medium hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:hover:text-white"
                          >
                            合っている
                          </button>
                          <button
                            type="button"
                            aria-pressed={
                              answerFeedback[message.id] === "mismatched"
                            }
                            onClick={() => {
                              setAnswerFeedback((current) => ({
                                ...current,
                                [message.id]: "mismatched",
                              }));
                              window.requestAnimationFrame(() =>
                                composerRef.current?.focus(),
                              );
                            }}
                            className="min-h-11 px-1 font-medium hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:hover:text-white"
                          >
                            違う
                          </button>
                        </div>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {localSafetyNotice && (
        <div
          role="alert"
          data-safety-kind={localSafetyNotice.kind}
          className={`mx-3 mb-2 rounded-xl border px-3 py-2 text-sm font-semibold leading-6 sm:mx-5 ${
            localSafetyNotice.kind === "emergency"
              ? "border-red-500 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-100"
              : "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
          }`}
        >
          {localSafetyNotice.message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-3 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-5 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
        >
          <span>{error}</span>
          {retryableQuestion && !isSending && (
            <button
              type="button"
              onClick={() => {
                const question = retryableQuestion;
                setRetryableQuestion(null);
                setError(null);
                void handleSend(question);
              }}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              再試行
            </button>
          )}
        </div>
      )}

      <form
        className="sticky bottom-0 z-20 mt-auto shrink-0 scroll-mb-[calc(var(--mobile-bottom-nav-h,0px)+env(safe-area-inset-bottom,0px)+1rem)] border-t border-slate-100 bg-white/95 px-3 pb-2 pt-2 backdrop-blur sm:px-5 dark:border-slate-800 dark:bg-slate-950/95"
        data-chatbot-composer=""
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend(composerRef.current?.value);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-blue-950">
          <textarea
            ref={composerRef}
            rows={1}
            defaultValue={input}
            suppressHydrationWarning
            disabled={isSending}
            onChange={(event) => {
              setInput(event.target.value);
              setLocalSafetyNotice(null);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void handleSend(event.currentTarget.value);
              }
            }}
            placeholder="作業や設備を質問"
            aria-label="質問入力"
            aria-describedby="chatbot-input-hint"
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 text-slate-950 outline-none placeholder:text-slate-500 disabled:opacity-60 sm:text-sm dark:text-white"
            data-primary-focus=""
          />
          <VoiceMicButton
            onFinalText={(text) => {
              setInput((previous) => (previous ? `${previous} ${text}` : text));
              setLocalSafetyNotice(null);
            }}
            className="min-h-11 min-w-11 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          />
          {isSending ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              aria-label="生成を停止"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="送信"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p
          id="chatbot-input-hint"
          className="mt-1 px-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400"
        >
          個人情報は入力しない
          <span className="sr-only">
            。Enterで送信、Shift+Enterで改行します。
          </span>
        </p>
      </form>
    </section>
  );
}

const LEGAL_UNIT_NUMBER = "[0-9０-９一二三四五六七八九十百千]+";
const ARTICLE_METADATA_RE = new RegExp(
  `^(第${LEGAL_UNIT_NUMBER}条(?:の${LEGAL_UNIT_NUMBER})*)`,
);
const PARAGRAPH_METADATA_RE = new RegExp(
  `^(第${LEGAL_UNIT_NUMBER}項(?:[・、](?:第)?${LEGAL_UNIT_NUMBER}項)*)`,
);
const ITEM_METADATA_RE = new RegExp(
  `^(第${LEGAL_UNIT_NUMBER}号(?:の${LEGAL_UNIT_NUMBER})?(?:[・、](?:第)?${LEGAL_UNIT_NUMBER}号(?:の${LEGAL_UNIT_NUMBER})?)*)`,
);

type TrustedSourceLocator = {
  article: string | null;
  paragraph: string | null;
  item: string | null;
  rawPosition: string | null;
};

/**
 * APIの構造化メタデータだけから表示用locatorを取り出す。
 * snippet/textの条文表現から項号を推測すると、回答が実際に依拠した範囲を
 * 越えて表示しうるため、source.article / paragraph / item と
 * citation.articleNum 以外は解析対象にしない。
 */
function trustedSourceLocator(
  source: ChatbotSource | undefined,
  citation: StructuredCitation | undefined,
): TrustedSourceLocator {
  const candidates = [source?.article, citation?.articleNum]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
  let article: string | null = null;
  let embeddedParagraph: string | null = null;
  let embeddedItem: string | null = null;

  for (const candidate of candidates) {
    const articleMatch = candidate.match(ARTICLE_METADATA_RE);
    if (!articleMatch?.[1]) continue;
    article = articleMatch[1];
    let remainder = candidate.slice(articleMatch[0].length);
    const paragraphMatch = remainder.match(PARAGRAPH_METADATA_RE);
    if (paragraphMatch?.[1]) {
      embeddedParagraph = paragraphMatch[1];
      remainder = remainder.slice(paragraphMatch[0].length);
    }
    const itemMatch = remainder.match(ITEM_METADATA_RE);
    if (itemMatch?.[1]) embeddedItem = itemMatch[1];
    break;
  }

  return {
    article,
    paragraph: source?.paragraph?.trim() || embeddedParagraph,
    item: source?.item?.trim() || embeddedItem,
    rawPosition: candidates[0] ?? null,
  };
}

function SourceDetails({ message }: { message: ChatMessage }) {
  const citations = message.citations ?? [];
  const sources = message.sources ?? [];
  const relatedNotices = (message.attachedNotices ?? []).filter(
    (notice) => notice.evidenceRole === "related-material",
  );
  const relatedLeaflets = (message.attachedLeaflets ?? []).slice(0, 2);
  const matchedCitationIndexes = new Set<number>();
  const entries: Array<{
    source?: ChatbotSource;
    citation?: StructuredCitation;
  }> = sources.map((source) => {
    const citationIndex = citations.findIndex(
      (citation, index) =>
        !matchedCitationIndexes.has(index) &&
        source.article.includes(citation.articleNum) &&
        (source.law.includes(citation.lawShort) ||
          source.law.includes(citation.fullName)),
    );
    if (citationIndex >= 0) matchedCitationIndexes.add(citationIndex);
    return {
      source,
      citation: citationIndex >= 0 ? citations[citationIndex] : undefined,
    };
  });
  citations.forEach((citation, index) => {
    if (!matchedCitationIndexes.has(index)) entries.push({ citation });
  });
  const statusLabel: Record<
    NonNullable<ChatbotSource["applicationStatus"]>,
    string
  > = {
    current: "現在施行中",
    future: "将来施行",
    past: "過去時点",
    unknown: "確認不能",
  };
  const evidenceCount =
    entries.length + relatedNotices.length + relatedLeaflets.length;
  return (
    <details
      className="mt-3 border-y border-slate-200 py-1 dark:border-slate-800"
      data-chatbot-source-details=""
    >
      <summary className="flex min-h-11 cursor-pointer items-center py-2 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-slate-200">
        根拠 {evidenceCount}件
      </summary>
      {entries.length > 0 && (
        <ol className="space-y-3 pb-3">
          {entries.map(({ source, citation }, index) => {
            const officialUrl = citation?.egovHref ?? source?.url;
            const locator = trustedSourceLocator(source, citation);
            const lawName =
              citation?.fullName ??
              source?.law ??
              "法令名を取得できません";
            const evidenceTitle =
              citation?.articleTitle ?? source?.articleTitle ?? "公式一次資料";
            const excerpt =
              source?.snippet ??
              source?.text ??
              "該当箇所を取得できません";
            const applicationStatus =
              source?.applicationStatus ??
              message.effectiveDateStatus?.status ??
              "unknown";
            const asOf = source?.asOf ?? message.effectiveDateStatus?.asOf;
            return (
              <li
                key={`${citation?.lawShort ?? source?.law ?? "source"}-${index}`}
                className="min-w-0 text-xs leading-5"
                data-chatbot-source-entry=""
              >
                <p className="font-semibold text-slate-900 dark:text-white">
                  ［{index + 1}］{evidenceTitle}
                </p>
                <dl
                  className="mt-1 grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-x-2 text-slate-600 dark:text-slate-300"
                  data-chatbot-source-locator=""
                >
                  <dt>法令名:</dt>
                  <dd className="min-w-0 break-words">{lawName}</dd>
                  {locator.article ? (
                    <>
                      <dt>条:</dt>
                      <dd>{locator.article}</dd>
                      <dt>項:</dt>
                      <dd>{locator.paragraph ?? "指定なし"}</dd>
                      <dt>号:</dt>
                      <dd>{locator.item ?? "指定なし"}</dd>
                    </>
                  ) : (
                    <>
                      <dt>資料内位置:</dt>
                      <dd className="min-w-0 break-words">
                        {locator.rawPosition ?? "取得できません"}
                      </dd>
                    </>
                  )}
                </dl>
                {source?.lawNumber && (
                  <p className="text-slate-600 dark:text-slate-300">
                    法令番号: {source.lawNumber}
                  </p>
                )}
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  施行状態: {statusLabel[applicationStatus]}
                  {source?.effectiveOn
                    ? `（${source.effectiveOn}）`
                    : citation?.effectiveDate
                      ? `（${citation.effectiveDate}）`
                      : ""}
                  {asOf ? `・対象 ${asOf}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                  該当箇所: {excerpt}
                </p>
                {officialUrl && (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center font-semibold text-blue-800 underline-offset-4 hover:underline dark:text-blue-300"
                  >
                    公式原文
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {relatedNotices.length > 0 && (
        <section
          aria-labelledby={`chatbot-related-notices-heading-${message.id}`}
          className="border-t border-slate-200 pb-3 pt-3 dark:border-slate-800"
        >
          <h3
            id={`chatbot-related-notices-heading-${message.id}`}
            className="text-xs font-semibold text-slate-900 dark:text-white"
          >
            関連資料（条文本文とは別）
          </h3>
          <ul className="mt-2 space-y-3">
            {relatedNotices.map((notice) => (
              <li
                key={notice.id}
                className="text-xs leading-5 text-slate-700 dark:text-slate-200"
                data-chatbot-related-notice=""
                data-evidence-role={notice.evidenceRole}
              >
                <p className="font-semibold text-slate-900 dark:text-white">
                  {notice.title}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {[notice.noticeNumber, notice.issuedDateRaw, notice.issuer]
                    .filter(Boolean)
                    .join("・")}
                </p>
                {notice.locator && (
                  <p className="mt-1">該当箇所: {notice.locator}</p>
                )}
                {notice.excerpt && (
                  <p className="mt-1">該当抜粋: {notice.excerpt}</p>
                )}
                {notice.independentlyCheckedAt && (
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    一次資料照合: {notice.independentlyCheckedAt}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-4">
                  {notice.pdfUrl && (
                    <a
                      href={notice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline-offset-4 hover:underline dark:text-blue-300"
                    >
                      公式PDF
                    </a>
                  )}
                  <a
                    href={notice.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline-offset-4 hover:underline dark:text-blue-300"
                  >
                    掲載ページ
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {relatedLeaflets.length > 0 && (
        <section
          aria-labelledby={`chatbot-related-leaflets-heading-${message.id}`}
          className="border-t border-slate-200 pb-3 pt-3 dark:border-slate-800"
        >
          <h3
            id={`chatbot-related-leaflets-heading-${message.id}`}
            className="text-xs font-semibold text-slate-900 dark:text-white"
          >
            公式リーフレット（条文本文とは別）
          </h3>
          <ul className="mt-2 space-y-3">
            {relatedLeaflets.map((leaflet) => {
              const officialUrl = safeMhlwMaterialUrl(
                leaflet.pdfUrl,
                leaflet.sourceUrl,
                leaflet.detailUrl,
              );
              return (
                <li
                  key={leaflet.id}
                  className="text-xs leading-5 text-slate-700 dark:text-slate-200"
                  data-chatbot-related-leaflet=""
                >
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {leaflet.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {[leaflet.publisher, leaflet.publishedDateRaw]
                      .filter(Boolean)
                      .join("・")}
                  </p>
                  {officialUrl && (
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex min-h-11 items-center font-semibold text-blue-800 underline-offset-4 hover:underline dark:text-blue-300"
                    >
                      公式資料
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </details>
  );
}

function safeMhlwMaterialUrl(...values: Array<string | null>): string | null {
  for (const value of values) {
    if (!value) continue;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        (host === "mhlw.go.jp" || host.endsWith(".mhlw.go.jp"))
      ) {
        return url.toString();
      }
    } catch {
      // Ignore malformed or non-official resource URLs.
    }
  }
  return null;
}
