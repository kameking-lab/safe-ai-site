"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { LawRevisionList } from "@/components/law-revision-list";
import { SummaryPanel } from "@/components/summary-panel";
import { TabNavigation, type TabId } from "@/components/tab-navigation";
import { lawRevisions } from "@/data/law-revisions";

type HomeScreenProps = {
  children: React.ReactNode;
};

export function HomeScreen({ children }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>("laws");
  const [selectedRevisionId, setSelectedRevisionId] = useState(lawRevisions[0]?.id ?? "");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-initial",
      role: "assistant",
      content: "質問を入力すると、選択中の法改正に沿ったダミー回答を表示します。",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const selectedRevision = useMemo(
    () => lawRevisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [selectedRevisionId]
  );

  useEffect(() => {
    if (!isSummaryLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSummaryLoading(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isSummaryLoading]);

  const handleSelectSummary = (revisionId: string) => {
    setSelectedRevisionId(revisionId);
    setActiveTab("summary");
    setIsSummaryLoading(true);
  };

  const handleSelectForQuestion = (revisionId: string) => {
    setSelectedRevisionId(revisionId);
    setActiveTab("chat");
  };

  const selectedRevisionTitle = selectedRevision?.title ?? "法改正が未選択です";

  useEffect(() => {
    if (!chatListRef.current) {
      return;
    }
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [chatMessages, activeTab]);

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now() + 1}`;
    const assistantText = `${selectedRevisionTitle} について、質問「${trimmed}」へのダミー回答です。現場の作業手順と責任者確認の流れを先に見直してください。`;

    setChatMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: trimmed },
      { id: assistantMessageId, role: "assistant", content: assistantText },
    ]);
    setChatInput("");
  };

  return (
    <main className="flex flex-1 flex-col">
      {children}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-5 lg:items-start">
        {activeTab === "laws" && (
          <LawRevisionList
            revisions={lawRevisions}
            selectedRevisionId={selectedRevisionId}
            onSelectSummary={handleSelectSummary}
            onSelectForQuestion={handleSelectForQuestion}
          />
        )}

        {activeTab === "summary" && (
          <SummaryPanel selectedRevision={selectedRevision} isLoading={isSummaryLoading} />
        )}

        {activeTab === "chat" && (
          <ChatPanel
            selectedRevisionTitle={selectedRevisionTitle}
            chatMessages={chatMessages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSend={handleSendChat}
            chatListRef={chatListRef}
          />
        )}

        {activeTab !== "laws" && (
          <LawRevisionList
            revisions={lawRevisions}
            selectedRevisionId={selectedRevisionId}
            onSelectSummary={handleSelectSummary}
            onSelectForQuestion={handleSelectForQuestion}
          />
        )}
      </div>
    </main>
  );
}
