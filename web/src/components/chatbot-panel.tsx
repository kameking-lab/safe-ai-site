"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ChatbotSource, FollowupSuggestion } from "@/app/api/chatbot/route";
import type { NoticeHit } from "@/lib/notice-search";
import { VoiceMicButton } from "@/components/voice-input-field";
import { BindingBadge } from "@/components/AIResponseCard";
import {
  CHAT_HISTORY_MAX_MESSAGES,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  type StoredChatMessage,
} from "@/lib/chat-history";
import { trackEvent } from "@/components/Analytics";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatbotSource[];
  source_type?: "rag" | "ai_inference";
  confidence?: "high" | "medium" | "low";
  confidenceScore?: number;
  followups?: FollowupSuggestion[];
  notices?: NoticeHit[];
};


type SavedSession = {
  id: string;
  title: string;
  savedAt: number;
  messages: ChatMessage[];
};

const STORAGE_KEY = "chatbot_history_v2";
const MAX_SESSIONS = 15;

const EGOV_LAW_NUMBERS: Record<string, string> = {
  "労働安全衛生法": "347AC0000000057",
  "労働基準法": "322AC0000000049",
  "じん肺法": "335AC0000000030",
  "労働安全衛生規則": "347M50002000032",
  "クレーン等安全規則": "347M50002000034",
  "有機溶剤中毒予防規則": "347M50002000036",
  "特定化学物質障害予防規則": "347M50002000040",
  "酸素欠乏症等防止規則": "347M50002000042",
};

const EXAMPLE_QUESTIONS = [
  "安全管理者の選任要件を教えてください",
  "フォークリフトの運転に必要な資格は？",
  "酸素欠乏危険作業の作業主任者の職務は？",
  "定期健康診断の実施頻度は？",
  "有機溶剤作業主任者の選任が必要な場合は？",
  "クレーン運転士の就業制限は？",
];

function loadSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SavedSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // ignore storage errors
  }
}

function messagesToMarkdown(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "**あなた**" : "**ANZEN AI**";
      const body = m.content;
      const sources =
        m.sources && m.sources.length > 0
          ? "\n\n> 参照条文: " + m.sources.map((s) => `${s.law} ${s.article}`).join(" / ")
          : "";
      return `${role}\n\n${body}${sources}`;
    })
    .join("\n\n---\n\n");
}

function messagesToText(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "あなた" : "ANZEN AI";
      return `[${role}]\n${m.content}`;
    })
    .join("\n\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function encodeShare(messages: ChatMessage[]): string {
  const data = messages.map((m) => ({
    r: m.role === "user" ? "u" : "a",
    c: m.content,
    s: m.sources?.map((src) => ({ l: src.law, a: src.article })),
  }));
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function ChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const prefillAppliedRef = useRef(false);

  // 音声完結モード: 新しいAI回答が来たら読み上げ
  useEffect(() => {
    if (!voiceMode) return;
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(last.content.slice(0, 400));
    utter.lang = "ja-JP";
    utter.rate = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [messages, voiceMode]);

  // 音声完結モード: 起動時に音声入力を促す
  const startVoiceInput = useCallback(() => {
    if (typeof window === "undefined") return;
    type SR = { new (): {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
      onerror: () => void;
      start: () => void;
    } };
    const w = window as unknown as { webkitSpeechRecognition?: SR; SpeechRecognition?: SR };
    const Ctor = w.webkitSpeechRecognition ?? w.SpeechRecognition;
    if (!Ctor) {
      alert("音声入力に対応していないブラウザです。Chrome系をお試しください。");
      return;
    }
    const recog = new Ctor();
    recog.lang = "ja-JP";
    recog.interimResults = false;
    recog.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) {
        setInput(text);
        // 自動送信（音声完結モード）
        setTimeout(() => void handleSend(text), 200);
      }
    };
    recog.onerror = () => {};
    recog.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSessions(loadSessions());
    // ページ再読込時に進行中の会話を復元（最大 50 件）
    const restored = loadChatHistory<ChatMessage>();
    if (restored && restored.length > 0) {
      setMessages(restored);
    }
  }, []);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const q = searchParams?.get("q");
    if (q && q.trim()) {
      prefillAppliedRef.current = true;
      setInput(q.trim());
    }
  }, [searchParams]);

  // メッセージ更新時に進行中セッションを localStorage に永続化
  useEffect(() => {
    saveChatHistory<StoredChatMessage>(messages as unknown as StoredChatMessage[]);
  }, [messages]);

  function saveCurrentSession(msgs: ChatMessage[]) {
    if (msgs.length < 2) return;
    const firstUser = msgs.find((m) => m.role === "user");
    const title = firstUser ? firstUser.content.slice(0, 40) : "チャット";
    const session: SavedSession = {
      id: crypto.randomUUID(),
      title,
      savedAt: Date.now(),
      messages: msgs,
    };
    const updated = [session, ...loadSessions().filter((s) => s.title !== title)].slice(
      0,
      MAX_SESSIONS
    );
    saveSessions(updated);
    setSessions(updated);
  }

  async function handleSend(question?: string) {
    const text = (question ?? input).trim();
    if (!text || isSending) return;

    trackEvent("chatbot_message", { message_length: text.length });

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);

    try {
      // 直近の会話履歴を最大8ターン送信（多ターン会話の文脈保持）
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error: string };
        throw new Error(errBody.error ?? "エラーが発生しました");
      }

      const data = (await res.json()) as {
        answer: string;
        sources: ChatbotSource[];
        source_type: "rag" | "ai_inference";
        confidence: "high" | "medium" | "low";
        confidenceScore?: number;
        followups?: FollowupSuggestion[];
        notices?: NoticeHit[];
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        source_type: data.source_type,
        confidence: data.confidence,
        confidenceScore: data.confidenceScore,
        followups: data.followups,
        notices: data.notices,
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "通信エラーが発生しました";
      setError(message);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }

  const handleCopyMessage = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopyStates((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopyStates((prev) => ({ ...prev, [id]: false })), 1500);
  }, []);

  function handleShare() {
    if (messages.length === 0) return;
    const encoded = encodeShare(messages);
    const url = `${window.location.origin}/chatbot/share/${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast("共有URLをコピーしました");
      setTimeout(() => setShareToast(null), 2500);
    });
  }

  function handleExportMD() {
    downloadFile(messagesToMarkdown(messages), "chatbot-session.md", "text/markdown;charset=utf-8");
    setExportOpen(false);
  }

  function handleExportTXT() {
    downloadFile(messagesToText(messages), "chatbot-session.txt", "text/plain;charset=utf-8");
    setExportOpen(false);
  }

  function handleExportJSON() {
    downloadFile(JSON.stringify(messages, null, 2), "chatbot-session.json", "application/json");
    setExportOpen(false);
  }

  function handleLoadSession(session: SavedSession) {
    setMessages(session.messages);
    setShowHistory(false);
  }

  function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    setSessions(updated);
  }

  function handleClearCurrent() {
    if (messages.length === 0) return;
    const ok =
      typeof window === "undefined"
        ? true
        : window.confirm(
            "進行中の会話履歴を削除します。よろしいですか？（保存済みセッションは残ります）"
          );
    if (!ok) return;
    setMessages([]);
    clearChatHistory();
    setError(null);
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as ChatMessage[];
        if (Array.isArray(parsed) && parsed[0]?.role) {
          setMessages(parsed);
          setExportOpen(false);
        }
      } catch {
        // ignore parse errors
      }
    };
    reader.readAsText(file);
  }

  const isEmpty = messages.length === 0;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* 履歴ボタン */}
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            aria-label="履歴を表示"
          >
            🕐 履歴{sessions.length > 0 && <span className="text-blue-600">({sessions.length})</span>}
          </button>
          {/* 6.3: 音声完結モード */}
          <button
            type="button"
            onClick={() => setVoiceMode((v) => !v)}
            aria-pressed={voiceMode}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold ${
              voiceMode
                ? "border-emerald-400 bg-emerald-600 text-white"
                : "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
            }`}
            title="音声入力で質問→AI回答を自動読み上げ（Web Speech API）"
          >
            🎙 音声完結モード{voiceMode ? "ON" : "OFF"}
          </button>
          {voiceMode && (
            <button
              type="button"
              onClick={startVoiceInput}
              className="flex items-center gap-1 rounded-lg border border-emerald-400 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
            >
              🎤 話して質問する
            </button>
          )}
        </div>
        {hasMessages && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* 履歴クリアボタン: 進行中の会話を削除（保存済みセッションは残る） */}
            <button
              type="button"
              onClick={handleClearCurrent}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              title={`進行中の会話を削除（最大${CHAT_HISTORY_MAX_MESSAGES}件まで自動保存）`}
            >
              🗑 履歴をクリア
            </button>
            {/* 共有ボタン */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              🔗 共有URL
            </button>
            {/* エクスポートドロップダウン */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ⬇ エクスポート ▾
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportMD}
                    className="block w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    📄 Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTXT}
                    className="block w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    📝 テキスト (.txt)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="block w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    🗄 JSON (.json)
                  </button>
                  <label className="block cursor-pointer w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 border-t border-slate-100">
                    ⬆ JSONをインポート
                    <input type="file" accept=".json" className="sr-only" onChange={handleImportJSON} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 履歴サイドバー */}
      {showHistory && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-bold text-slate-600">保存された会話履歴</p>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400">まだ履歴がありません</p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleLoadSession(s)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:border-blue-200"
                  >
                    <span className="truncate max-w-[200px]">{s.title}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400">
                        {new Date(s.savedAt).toLocaleDateString("ja-JP")}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        onKeyDown={(e) => e.key === "Enter" && handleDeleteSession(s.id, e as unknown as React.MouseEvent)}
                        className="text-slate-300 hover:text-red-500"
                        aria-label="削除"
                      >
                        ✕
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 免責バナー */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800 leading-5">
          <span className="font-bold">⚠ 免責事項：</span>
          本サービスは法的助言ではありません。実際の判断は必ず専門家（労働安全コンサルタント等）にご確認ください。
        </p>
      </div>

      {/* チャット履歴 */}
      <div
        ref={listRef}
        className="min-h-[320px] flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                労働安全衛生法についてご質問ください
              </p>
              <p className="mt-1 text-xs text-slate-500">
                安衛法・安衛則・クレーン則・有機則・特化則・酸欠則に対応
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="whitespace-pre-wrap">
                      {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={idx}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      })}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* コピーボタン */}
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition"
                    aria-label="コピー"
                  >
                    {copyStates[msg.id] ? "✓ コピー済" : "📋 コピー"}
                  </button>
                </div>

                {/* RAGソース・信頼度バッジ */}
                {msg.role === "assistant" && msg.source_type && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {msg.source_type === "rag" ? (
                      <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        📚 法令データベースから検索
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                        🤖 AI推論
                      </span>
                    )}
                    {msg.confidence === "high" && (
                      <span className="text-[11px] text-slate-500">
                        🟢 信頼度：高
                        {typeof msg.confidenceScore === "number" && ` (${Math.round(msg.confidenceScore * 100)}%)`}
                      </span>
                    )}
                    {msg.confidence === "medium" && (
                      <span className="text-[11px] text-slate-500">
                        🟡 信頼度：中
                        {typeof msg.confidenceScore === "number" && ` (${Math.round(msg.confidenceScore * 100)}%)`}
                      </span>
                    )}
                    {msg.confidence === "low" && msg.source_type !== "rag" && (
                      <span className="text-[11px] text-slate-500">🔴 条文を特定できず</span>
                    )}
                  </div>
                )}

                {/* 根拠条文の表示 */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <details className="mt-2 max-w-[88%] rounded-lg border border-slate-200 bg-white p-3" open={msg.sources.length <= 2}>
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                      参照条文 ({msg.sources.length}件)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {msg.sources.map((src, i) => (
                        <ChatbotSourceCard key={i} src={src} />
                      ))}
                    </div>
                  </details>
                )}

                {/* 関連通達・告示・指針（厚労省一次資料DB由来） */}
                {msg.role === "assistant" && msg.notices && msg.notices.length > 0 && (
                  <details className="mt-2 max-w-[88%] rounded-lg border border-amber-200 bg-amber-50 p-3" open>
                    <summary className="cursor-pointer text-xs font-semibold text-amber-900 hover:text-amber-700">
                      関連通達・告示 ({msg.notices.length}件・拘束力レベル付き)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {msg.notices.map((n) => {
                        return (
                          <div key={n.id} className="rounded-md bg-white p-2 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                                {n.docType}
                              </span>
                              {n.noticeNumber && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-900">
                                  {n.noticeNumber}
                                </span>
                              )}
                              <BindingBadge level={n.bindingLevel} />
                              {n.issuedDateRaw && (
                                <span className="text-[10px] text-slate-500">{n.issuedDateRaw}</span>
                              )}
                            </div>
                            <p className="mt-1 font-semibold text-slate-900 leading-snug">{n.title}</p>
                            {n.issuer && (
                              <p className="mt-0.5 text-[11px] text-slate-600">発出: {n.issuer}</p>
                            )}
                            <a
                              href={n.detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              原文（安全衛生情報センター）
                            </a>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[10px] text-amber-800">
                      ※ 出典: 厚労省・中央労働災害防止協会 安全衛生情報センター。
                      <a href="/resources" className="ml-1 underline">一次資料DB</a> も参照ください。
                    </p>
                  </details>
                )}

                {/* フォローアップ質問サジェスト */}
                {msg.role === "assistant" && msg.followups && msg.followups.length > 0 && !isSending && (
                  <div className="mt-2 max-w-[88%]">
                    <p className="mb-1 text-[11px] text-slate-500">続けて質問する：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followups.map((fu, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSend(fu.prompt)}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-[0.98]"
                        >
                          {fu.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6.2: 横断アクション — KY/RA/法改正へ遷移 */}
                {msg.role === "assistant" && !isSending && (
                  <div className="mt-2 max-w-[88%]">
                    <p className="mb-1 text-[11px] text-slate-500">この内容を活用：</p>
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={`/ky?q=${encodeURIComponent(msg.content.slice(0, 80))}`}
                        className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        → KYで確認
                      </a>
                      <a
                        href={`/chemical-ra?name=${encodeURIComponent(msg.content.slice(0, 40))}`}
                        className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-800 hover:bg-violet-100"
                      >
                        → 化学物質RA
                      </a>
                      <a
                        href={`/laws?q=${encodeURIComponent(msg.content.slice(0, 40))}`}
                        className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
                      >
                        → 法改正一覧
                      </a>
                      <a
                        href={`/accidents?q=${encodeURIComponent(msg.content.slice(0, 40))}`}
                        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100"
                      >
                        → 事故事例
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 送信中インジケータ */}
            {isSending && (
              <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-4 py-3 max-w-[88%]">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span className="text-xs text-slate-500">回答を生成中...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 入力エリア */}
      <div className="flex gap-2">
        <textarea
          rows={3}
          value={input}
          disabled={isSending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={"安衛法について質問を入力…\nCmd/Ctrl+Enter で送信"}
          className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:text-sm"
          aria-label="質問入力"
        />
        <div className="flex flex-col gap-2">
          <VoiceMicButton
            onFinalText={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          />
          <button
            type="button"
            disabled={isSending || !input.trim()}
            onClick={() => handleSend()}
            className="shrink-0 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>

      {/* 免責注記 */}
      <p className="text-xs text-slate-400 leading-5">
        ※ 回答は提供済み法令条文に基づくものです。最新の法令は
        <a
          href="https://laws.e-gov.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          e-Gov法令検索
        </a>
        で確認してください。法的判断は専門家にご相談ください。
      </p>

      {/* 共有URLコピー完了トースト */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg z-50">
          {shareToast}
        </div>
      )}
    </div>
  );
}

/**
 * 参照条文 1 件分のカード。
 * 200 字でトリミングしたダイジェストと、トグルで表示する条文全文を持つ。
 * fullText が無い（MLIT 資料等の）場合は従来どおり text のみ表示。
 */
function ChatbotSourceCard({ src }: { src: ChatbotSource }) {
  const [showFull, setShowFull] = useState(false);
  const lawName = src.law.replace(/（[^）]+）$/, "");
  const egovHref = EGOV_LAW_NUMBERS[lawName]
    ? `https://laws.e-gov.go.jp/law/${EGOV_LAW_NUMBERS[lawName]}`
    : `https://laws.e-gov.go.jp/search?keyword=${encodeURIComponent(src.law)}`;
  const hasFull =
    typeof src.fullText === "string" &&
    src.fullText.length > 0 &&
    src.fullText !== src.text;

  return (
    <div className="rounded-md bg-slate-50 p-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="font-semibold text-blue-700">
          {src.law} {src.article}
        </p>
        <a
          href={src.url ?? egovHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
        >
          {src.url ? "原文を確認" : "e-Gov で確認"}
        </a>
      </div>
      {src.snippet && src.snippet !== src.text && (
        <p className="mt-1 rounded bg-yellow-50 px-1.5 py-1 text-[11px] text-amber-900 leading-5">
          💡 該当箇所: {src.snippet}
        </p>
      )}
      <p className="mt-1 whitespace-pre-wrap text-slate-600 leading-5">
        {showFull && src.fullText ? src.fullText : src.text}
      </p>
      {hasFull && (
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
          aria-expanded={showFull}
        >
          {showFull ? "▲ 全文を閉じる" : "▼ 条文全文を表示"}
        </button>
      )}
    </div>
  );
}
