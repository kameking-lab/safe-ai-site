"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { LawRevisionList } from "@/components/law-revision-list";
import { SummaryPanel } from "@/components/summary-panel";
import { TabNavigation, type TabId } from "@/components/tab-navigation";
import { createServices } from "@/lib/services/service-factory";
import type { ServiceError, ServiceStatus } from "@/lib/types/api";
import type { RevisionSummary } from "@/lib/types/domain";
type HomeScreenProps = {
  children: React.ReactNode;
};

export function HomeScreen({ children }: HomeScreenProps) {
  const services = useMemo(() => createServices(), []);
  const [revisions, setRevisions] = useState(() => services.revision.getCachedRevisions());
  const firstRevisionId = services.revision.getInitialRevisionId() ?? "";
  const [activeTab, setActiveTab] = useState<TabId>("laws");
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>(firstRevisionId);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [loadingRevisionId, setLoadingRevisionId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<ServiceError | null>(null);
  const [chatError, setChatError] = useState<ServiceError | null>(null);
  const [revisionError, setRevisionError] = useState<ServiceError | null>(null);
  const [revisionStatus, setRevisionStatus] = useState<ServiceStatus>("idle");
  const [summaryStatus, setSummaryStatus] = useState<ServiceStatus>("idle");
  const [chatStatus, setChatStatus] = useState<ServiceStatus>("idle");
  const [selectedSummary, setSelectedSummary] = useState<RevisionSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(services.chat.createInitialMessages());
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const selectedRevision = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [revisions, selectedRevisionId]
  );

  useEffect(() => {
    let active = true;

    async function loadRevisions() {
      setRevisionStatus("loading");
      const result = await services.revision.getLawRevisions();
      if (!active) return;

      if (result.ok) {
        setRevisions(result.data);
        setRevisionStatus("success");
        setRevisionError(null);
        if (!selectedRevisionId && result.data.length > 0) {
          setSelectedRevisionId(result.data[0].id);
        }
        return;
      }

      setRevisionStatus("error");
      setRevisionError(result.error);
    }

    void loadRevisions();
    return () => {
      active = false;
    };
  }, [services.revision, selectedRevisionId]);

  useEffect(() => {
    if (!isSummaryLoading) return;

    const timer = window.setTimeout(() => {
      setIsSummaryLoading(false);
      setLoadingRevisionId(null);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isSummaryLoading]);

  const handleSelectSummary = (revisionId: string) => {
    setSummaryError(null);
    if (revisionId === selectedRevisionId) {
      setActiveTab("summary");
      setIsSummaryLoading(true);
      setLoadingRevisionId(revisionId);
      void services.summary
        .getSummaryByRevisionId({ revisionId })
        .then((response) => {
          if (!response.ok) {
            setSummaryStatus("error");
            setSummaryError(response.error);
            setSelectedSummary(null);
          } else {
            setSummaryStatus("success");
            setSummaryError(null);
            setSelectedSummary(response.data.summary);
          }
        })
        .finally(() => {
          setIsSummaryLoading(false);
          setLoadingRevisionId(null);
        });
      return;
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
      setSummaryStatus("loading");
      const response = await services.summary.getSummaryByRevisionId({ revisionId: selectedRevisionId });
      if (!active) return;
      if (!response.ok) {
        setSummaryStatus("error");
        setSummaryError(response.error);
        setSelectedSummary(null);
        return;
      }
      setSummaryStatus("success");
      setSummaryError(null);
      setSelectedSummary(response.data.summary);
    }
    void loadSummary();
    return () => {
      active = false;
    };
  }, [selectedRevisionId, services.summary]);

  useEffect(() => {
    if (!chatListRef.current) {
      return;
    }
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [chatMessages, activeTab]);

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatSending) {
      return;
    }

    setIsChatSending(true);
    setChatStatus("loading");
    setChatError(null);

    const userMessageId = `user-${Date.now()}`;
    const response = await services.chat.sendMessage({
      revision: selectedRevision,
      question: trimmed,
    });

    if (!response.ok) {
      setChatStatus("error");
      setChatError(response.error);
      setIsChatSending(false);
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: trimmed },
      response.data,
    ]);
    setChatStatus("success");
    setChatInput("");
    window.setTimeout(() => setIsChatSending(false), 320);
  };

  const retrySummary = () => {
    if (!selectedRevisionId) return;
    handleSelectSummary(selectedRevisionId);
  };

  const retryRevisions = async () => {
    setRevisionStatus("loading");
    const result = await services.revision.getLawRevisions();
    if (!result.ok) {
      setRevisionStatus("error");
      setRevisionError(result.error);
      return;
    }
    setRevisions(result.data);
    setRevisionStatus("success");
    setRevisionError(null);
  };

  return (
    <main className="flex flex-1 flex-col">
      {children}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      {revisionStatus === "loading" && (
        <p className="mx-4 mt-2 text-xs text-slate-500">法改正一覧を読み込み中です...</p>
      )}

      <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-5 lg:items-start">
        {activeTab === "laws" && (
          <LawRevisionList
            revisions={revisions}
            selectedRevisionId={selectedRevisionId}
            loadingRevisionId={loadingRevisionId}
            error={revisionError}
            onRetry={retryRevisions}
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
            status={summaryStatus}
            error={summaryError}
            onRetry={retrySummary}
          />
        )}

        {activeTab === "chat" && (
          <ChatPanel
            selectedRevisionTitle={selectedRevisionTitle}
            chatMessages={chatMessages}
            chatInput={chatInput}
            isSending={isChatSending}
            status={chatStatus}
            error={chatError}
            onChatInputChange={setChatInput}
            onSend={handleSendChat}
            onRetry={handleSendChat}
            chatListRef={chatListRef}
          />
        )}

        {activeTab !== "laws" && (
          <LawRevisionList
            revisions={revisions}
            selectedRevisionId={selectedRevisionId}
            loadingRevisionId={loadingRevisionId}
            error={revisionError}
            onRetry={retryRevisions}
            onSelectSummary={handleSelectSummary}
            onSelectForQuestion={handleSelectForQuestion}
          />
        )}
      </div>
    </main>
  );
}
