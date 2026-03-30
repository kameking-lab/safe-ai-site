"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { LawRevisionList } from "@/components/law-revision-list";
import { SummaryPanel } from "@/components/summary-panel";
import { TabNavigation, type TabId } from "@/components/tab-navigation";
import { createChatResponse, createInitialChatMessages } from "@/lib/services/chat-service";
import { getLawRevisions } from "@/lib/services/revision-service";
import { getSummaryByRevisionId } from "@/lib/services/summary-service";
import type { RevisionSummary } from "@/lib/types/domain";

type HomeScreenProps = {
  children: React.ReactNode;
};

export function HomeScreen({ children }: HomeScreenProps) {
  const revisions = useMemo(() => getLawRevisions(), []);
  const firstRevisionId = revisions[0]?.id ?? "";
  const [activeTab, setActiveTab] = useState<TabId>("laws");
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>(firstRevisionId);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [loadingRevisionId, setLoadingRevisionId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<RevisionSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(createInitialChatMessages());
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const selectedRevision = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [revisions, selectedRevisionId]
  );

  useEffect(() => {
    if (!isSummaryLoading) return;

    const timer = window.setTimeout(() => {
      setIsSummaryLoading(false);
      setLoadingRevisionId(null);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isSummaryLoading]);

  const handleSelectSummary = (revisionId: string) => {
    if (revisionId === selectedRevisionId) {
      void getSummaryByRevisionId(revisionId).then((data) => {
        setSelectedSummary(data);
        setIsSummaryLoading(false);
        setLoadingRevisionId(null);
      });
    }
    setSelectedRevisionId(revisionId);
    setActiveTab("summary");
    setIsSummaryLoading(true);
    setLoadingRevisionId(revisionId);
    setSelectedSummary(null);
  };

  const handleSelectForQuestion = (revisionId: string) => {
    setSelectedRevisionId(revisionId);
    setActiveTab("chat");
  };

  const selectedRevisionTitle = selectedRevision?.title ?? "法改正が未選択です";

  useEffect(() => {
    if (!selectedRevisionId) return;
    let active = true;

    async function loadSummary() {
      const data = await getSummaryByRevisionId(selectedRevisionId);
      if (active) {
        setSelectedSummary(data);
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, [selectedRevisionId]);

  useEffect(() => {
    if (!chatListRef.current) {
      return;
    }
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [chatMessages, activeTab]);

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatSending) {
      return;
    }

    setIsChatSending(true);

    const userMessageId = `user-${Date.now()}`;
    const assistantMessage = createChatResponse({
      revision: selectedRevision,
      question: trimmed,
    });

    setChatMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: trimmed },
      assistantMessage,
    ]);
    setChatInput("");
    window.setTimeout(() => setIsChatSending(false), 320);
  };

  return (
    <main className="flex flex-1 flex-col">
      {children}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-5 lg:items-start">
        {activeTab === "laws" && (
          <LawRevisionList
            revisions={revisions}
            selectedRevisionId={selectedRevisionId}
            loadingRevisionId={loadingRevisionId}
            onSelectSummary={handleSelectSummary}
            onSelectForQuestion={handleSelectForQuestion}
          />
        )}

        {activeTab === "summary" && (
          <SummaryPanel
            selectedRevisionId={selectedRevisionId}
            selectedRevisionTitle={selectedRevisionTitle}
            summaryContent={selectedSummary}
            isLoading={isSummaryLoading}
          />
        )}

        {activeTab === "chat" && (
          <ChatPanel
            selectedRevisionTitle={selectedRevisionTitle}
            chatMessages={chatMessages}
            chatInput={chatInput}
            isSending={isChatSending}
            onChatInputChange={setChatInput}
            onSend={handleSendChat}
            chatListRef={chatListRef}
          />
        )}

        {activeTab !== "laws" && (
          <LawRevisionList
            revisions={revisions}
            selectedRevisionId={selectedRevisionId}
            loadingRevisionId={loadingRevisionId}
            onSelectSummary={handleSelectSummary}
            onSelectForQuestion={handleSelectForQuestion}
          />
        )}
      </div>
    </main>
  );
}
