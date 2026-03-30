"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([
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

      <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
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
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-bold text-slate-900">質問チャット</h2>
            <p className="mt-1 text-sm font-medium text-slate-700">対象: {selectedRevisionTitle}</p>

            <div
              ref={chatListRef}
              className="mt-3 h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              {chatMessages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-6 ${
                      isUser
                        ? "ml-auto bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {message.content}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendChat();
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 focus:ring-2"
                placeholder="この法改正について質問を入力"
                aria-label="質問入力"
              />
              <button
                type="button"
                onClick={handleSendChat}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                送信
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              ※ 現在はダミー回答です。後でAPI連携に差し替えます。
            </p>
          </section>
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
