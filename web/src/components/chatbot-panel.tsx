"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ChatbotSource, FollowupSuggestion } from "@/app/api/chatbot/route";
import type { NoticeHit } from "@/lib/notice-search";
import type {
  StructuredCitation,
  RelatedLawLink,
  DigDeeperLink,
} from "@/lib/chatbot-enrichment";
// Phase 4: 通達/リーフレット添付カード
import type {
  AttachedLeaflet,
  AttachedNotice,
} from "@/lib/chatbot-notice-attachment";
import {
  ChatbotLeafletList,
  ChatbotNoticeList,
} from "@/components/chatbot/notice-leaflet-list";
import { LAW_CATEGORY_OPTIONS, type LawCategoryFilter } from "@/lib/rag-search";
import { VoiceMicButton } from "@/components/voice-input-field";
import { BindingBadge } from "@/components/AIResponseCard";
import { Mascot } from "@/components/mascot";
import {
  CHAT_HISTORY_MAX_MESSAGES,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  type StoredChatMessage,
} from "@/lib/chat-history";
import { trackEvent } from "@/components/Analytics";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";

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
  citations?: StructuredCitation[];
  relatedLaws?: RelatedLawLink[];
  digDeeperLinks?: DigDeeperLink[];
  scopeWarnings?: string[];
  /** Phase 4: 3層統合された通達リスト（条文紐付け+応答引用+クエリ） */
  attachedNotices?: AttachedNotice[];
  /** Phase 4: 条文紐付けで取得した厚労省リーフレット */
  attachedLeaflets?: AttachedLeaflet[];
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
  "足場の手すり高さは？",
  "墜落防止のフルハーネス着用義務は？",
  "統括安全衛生責任者の選任要件は？",
  "KYT 4ラウンド法とは？",
  "有機溶剤作業主任者の選任が必要な場合は？",
  "定期健康診断の実施頻度は？",
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
      const role = m.role === "user" ? "**あなた**" : "**安全AIポータル**";
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
      const role = m.role === "user" ? "あなた" : "安全AIポータル";
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
  const [lawCategory, setLawCategory] = useState<LawCategoryFilter>("all");
  // P1-2: 生成停止（AbortController）と失敗時の再試行
  const [retryableQuestion, setRetryableQuestion] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const prefillAppliedRef = useRef(false);
  const copilot = useOptionalCopilot();

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
    // Feed the Copilot SafetyContext so /accidents-reports and
    // /strategy/plan-generator can pre-fill industry & concerns.
    copilot?.ingestText(text, "chatbot");

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
    setRetryableQuestion(null);
    // P1-2: このターン用の AbortController（停止ボタンから abort する）
    const controller = new AbortController();
    abortRef.current = controller;

    // rAF defers the scroll-height read until after the browser has flushed
    // the message-list re-render, avoiding a forced synchronous layout.
    // Lighthouse audit 2026-05-14 (B-13) flagged forced-reflow on 11 pages.
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });

    // P0-001 (usability-audit-day2): SSE ストリーミング応答に対応。
    // 「送信→10秒沈黙→ドット3つ」状態を解消し、最初の文字を1秒以内に表示。
    // 失敗時は従来 JSON 応答に自動 fallback して互換性を確保する。
    const assistantId = crypto.randomUUID();
    const placeholderAssistant: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    setMessages([...nextMessages, placeholderAssistant]);

    const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    const requestBody = JSON.stringify({ message: text, history, lawCategory });

    // catch 節からも参照できるよう try の外で宣言（停止時に途中までの本文を残す）
    let streamedContent = "";

    try {
      const res = await fetch("/api/chatbot/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        // Fallback to non-stream endpoint
        throw new Error("stream-fallback");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalMeta: {
        sources?: ChatbotSource[];
        source_type?: "rag" | "ai_inference";
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
        answer?: string;
      } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE は \n\n でフレーム区切り
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          if (!frame.trim()) continue;
          const lines = frame.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            if (event === "text" && typeof parsed.chunk === "string") {
              streamedContent += parsed.chunk;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: streamedContent } : m)),
              );
              requestAnimationFrame(() => {
                const el = listRef.current;
                if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              });
            } else if (event === "meta") {
              finalMeta = parsed as typeof finalMeta;
            } else if (event === "error") {
              throw new Error(typeof parsed.message === "string" ? parsed.message : "ストリーミングエラー");
            }
          } catch (parseErr) {
            if ((parseErr as Error).message.startsWith("ストリーミング")) throw parseErr;
            // 不正フレームは黙って skip
          }
        }
      }

      // ストリーミング完了 — meta を反映してセッション保存
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: finalMeta.answer ?? streamedContent,
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
              }
            : m,
        );
        saveCurrentSession(next);
        return next;
      });
    } catch (streamErr) {
      // P1-2: ユーザーが停止した場合は fallback せず、途中までの本文を残して終了
      if (streamErr instanceof Error && (streamErr.name === "AbortError" || controller.signal.aborted)) {
        setMessages((prev) => {
          const next = streamedContent.trim()
            ? prev.map((m) =>
                m.id === assistantId ? { ...m, content: streamedContent + "\n\n⏹ 生成を停止しました。" } : m,
              )
            : prev.filter((m) => m.id !== assistantId);
          if (streamedContent.trim()) saveCurrentSession(next);
          return next;
        });
        return;
      }
      // P0-001: ストリーミング失敗時は従来 /api/chatbot で同期 JSON 応答に fallback
      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: controller.signal,
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
          citations?: StructuredCitation[];
          relatedLaws?: RelatedLawLink[];
          digDeeperLinks?: DigDeeperLink[];
          scopeWarnings?: string[];
          attachedNotices?: AttachedNotice[];
          attachedLeaflets?: AttachedLeaflet[];
        };
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.answer,
                  sources: data.sources,
                  source_type: data.source_type,
                  confidence: data.confidence,
                  confidenceScore: data.confidenceScore,
                  followups: data.followups,
                  notices: data.notices,
                  citations: data.citations,
                  relatedLaws: data.relatedLaws,
                  digDeeperLinks: data.digDeeperLinks,
                  scopeWarnings: data.scopeWarnings,
                  attachedNotices: data.attachedNotices,
                  attachedLeaflets: data.attachedLeaflets,
                }
              : m,
          );
          saveCurrentSession(next);
          return next;
        });
      } catch (fallbackErr) {
        // P1-2: fallback 中の停止は静かに終了
        if (fallbackErr instanceof Error && (fallbackErr.name === "AbortError" || controller.signal.aborted)) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }
        const message =
          fallbackErr instanceof Error ? fallbackErr.message : "通信エラーが発生しました";
        setError(message);
        // P1-2: 失敗した質問を保持し「再試行」を可能にする
        setRetryableQuestion(text);
        // 失敗時は placeholder を残さず除去
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
      // streamErr の original cause はログのみ
      if (streamErr instanceof Error && streamErr.message !== "stream-fallback") {
        console.warn("[chatbot] stream error, fell back to JSON:", streamErr.message);
      }
    } finally {
      setIsSending(false);
      abortRef.current = null;
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }

  // P1-2: 生成停止
  function handleStop() {
    abortRef.current?.abort();
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
            aria-label="保存済み会話を開く"
            title="保存済みの会話セッションを一覧表示します"
          >
            🕐 保存した会話{sessions.length > 0 && <span className="text-blue-600">({sessions.length})</span>}
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
            title="音声で質問→AI回答を自動読み上げ (Web Speech API)。タップで切替"
          >
            🎙 {voiceMode ? "音声で会話中 (タップで終了)" : "音声で会話する"}
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
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                <div className={msg.role === "assistant" ? "flex items-start gap-2" : ""}>
                  {msg.role === "assistant" && (
                    <Mascot size="sm" className="mt-1 shrink-0" alt="AI回答" />
                  )}
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
                </div>

                {/* コピーボタン */}
                <div className={`mt-1 flex items-center gap-2 ${msg.role === "assistant" ? "ml-10" : ""}`}>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition"
                    aria-label="コピー"
                  >
                    {copyStates[msg.id] ? "✓ コピー済" : "📋 コピー"}
                  </button>
                </div>

                {/* 範囲外参照の警告（ハルシネーション抑制） */}
                {msg.role === "assistant" && msg.scopeWarnings && msg.scopeWarnings.length > 0 && (
                  <div className="mt-2 ml-10 max-w-[88%] rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-[11px] font-bold text-rose-800">⚠ 提供データ範囲外の参照を検出</p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-rose-700 leading-5">
                      {msg.scopeWarnings.map((w, i) => (
                        <li key={i}>・{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* RAGソース・信頼度バッジ */}
                {msg.role === "assistant" && msg.source_type && (
                  <div className="mt-1.5 ml-10 flex flex-wrap items-center gap-1.5">
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
                  <details className="mt-2 ml-10 max-w-[88%] rounded-lg border border-slate-200 bg-white p-3" open={msg.sources.length <= 2}>
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

                {/* 構造化出典: 条文番号 + 施行日 + 発出機関 */}
                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <details
                    className="mt-2 ml-10 max-w-[88%] rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"
                    open
                  >
                    <summary className="cursor-pointer text-xs font-semibold text-emerald-900 hover:text-emerald-700">
                      📎 出典（条文番号＋施行日＋発出機関）{msg.citations.length}件
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {msg.citations.map((c, i) => (
                        <li key={i} className="rounded-md bg-white p-2 text-[11px] leading-5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-emerald-800">
                              {c.lawShort}
                              {c.articleNum}
                            </span>
                            {c.articleTitle && (
                              <span className="text-slate-600">「{c.articleTitle}」</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-slate-700">
                            <span className="font-semibold">所管：</span>
                            {c.issuer}
                            {c.effectiveDate && (
                              <>
                                <span className="mx-1 text-slate-400">／</span>
                                <span className="font-semibold">施行：</span>
                                {c.effectiveDate}
                              </>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <a
                              href={c.searchHref}
                              className="rounded border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              法令検索で条文を見る
                            </a>
                            {c.egovHref && (
                              <a
                                href={c.egovHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                e-Govで原文を見る
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* P0-019 (usability-audit-day3): 関連系 (合わせて法令 + もっと深く知る)
                    を「関連=スカイ」で統一し、初期は折りたたみ。1 回答に 17 色が
                    並んでいた問題を「出典=エメラルド / 関連=スカイ / 警告=ロゼ」の
                    3 色体系に絞り込んで視線誘導を整理する。 */}
                {msg.role === "assistant" && msg.relatedLaws && msg.relatedLaws.length > 0 && (
                  <details className="mt-2 ml-10 max-w-[88%] rounded-lg border border-sky-200 bg-sky-50/70 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-sky-900 hover:text-sky-700">
                      📚 合わせて確認すべき法令 ({msg.relatedLaws.length}件)
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {msg.relatedLaws.map((r, i) => (
                        <li key={i} className="text-[11px] leading-5">
                          <a
                            href={r.searchHref}
                            className="font-bold text-sky-800 underline-offset-2 hover:underline"
                          >
                            {r.lawShort}（{r.fullName}）
                          </a>
                          <span className="ml-1 text-slate-600">— {r.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* もっと深く知る: 事故事例・通達・業種別レポート — 関連系=スカイに統一 */}
                {msg.role === "assistant" && msg.digDeeperLinks && msg.digDeeperLinks.length > 0 && (
                  <details className="mt-2 ml-10 max-w-[88%] rounded-lg border border-sky-200 bg-sky-50/50 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-sky-900 hover:text-sky-700">
                      🔍 もっと深く知る ({msg.digDeeperLinks.length}件)
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {msg.digDeeperLinks.map((d, i) => (
                        <li key={i} className="text-[11px] leading-5">
                          <a
                            href={d.href}
                            className="font-bold text-sky-800 underline-offset-2 hover:underline"
                          >
                            {d.label}
                          </a>
                          <span className="ml-1 text-slate-600">— {d.description}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Phase 4: 通達・告示・リーフレットカード（条文紐付け+応答引用+クエリの3層統合） */}
                {msg.role === "assistant" && msg.attachedNotices && msg.attachedNotices.length > 0 && (
                  <div className="ml-10 max-w-[88%]">
                    <ChatbotNoticeList notices={msg.attachedNotices} />
                    <p className="mt-1 text-[10px] text-amber-800 dark:text-amber-300">
                      ※ 出典: 厚労省・中央労働災害防止協会 安全衛生情報センター。
                      <a href="/resources" className="ml-1 underline">一次資料DB</a> も参照ください。
                    </p>
                  </div>
                )}
                {msg.role === "assistant" && msg.attachedLeaflets && msg.attachedLeaflets.length > 0 && (
                  <div className="ml-10 max-w-[88%]">
                    <ChatbotLeafletList leaflets={msg.attachedLeaflets} />
                  </div>
                )}
                {/* 旧 notices フィールド（attachedNotices が無い古いキャッシュ応答用、後方互換） */}
                {msg.role === "assistant" &&
                  (!msg.attachedNotices || msg.attachedNotices.length === 0) &&
                  msg.notices &&
                  msg.notices.length > 0 && (
                  <details className="mt-2 ml-10 max-w-[88%] rounded-lg border border-amber-200 bg-amber-50 p-3" open>
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
                  </details>
                )}

                {/* フォローアップ質問サジェスト */}
                {msg.role === "assistant" && msg.followups && msg.followups.length > 0 && !isSending && (
                  <div className="mt-2 ml-10 max-w-[88%]">
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

                {/* 6.2: 横断アクション — KY/RA/法改正へ遷移
                    + Copilot深化：業種別レポート・年次計画への直接遷移 */}
                {msg.role === "assistant" && !isSending && (
                  <div className="mt-2 ml-10 max-w-[88%]">
                    <p className="mb-1 text-[11px] text-slate-500">この内容を活用：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {/* Copilot連携: 業種が検出済みなら業種別レポートへ、
                          そうでなければハブへフォールバック */}
                      <a
                        href={
                          copilot?.state.industry
                            ? `/accidents-reports/${copilot.state.industry}`
                            : `/accidents-reports`
                        }
                        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100"
                      >
                        → 業種別 事故レポート
                      </a>
                      <a
                        href={(() => {
                          const params = new URLSearchParams();
                          if (copilot?.state.industry)
                            params.set("industry", copilot.state.industry);
                          if (copilot?.state.keyConcerns?.[0])
                            params.set("focus", copilot.state.keyConcerns[0]);
                          const qs = params.toString();
                          return `/strategy/plan-generator${qs ? `?${qs}` : ""}`;
                        })()}
                        className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-800 hover:bg-violet-100"
                      >
                        → 年次計画に反映
                      </a>
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
                        href="/signage"
                        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                        title="朝礼・現場の常時表示画面で活用"
                      >
                        → サイネージで掲示
                      </a>
                    </div>
                    {/* P2項目9: 統一CTA — 結果画面下部の次アクション (最後のメッセージのみ表示) */}
                    {idx === messages.length - 1 && (
                      <div className="mt-3">
                        <MainFeatureNextActions exclude="chatbot" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 送信中インジケータ＋停止ボタン (P1-2) */}
            {isSending && (
              <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-4 py-3 max-w-[88%]">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span className="text-xs text-slate-500">回答を生成中...</span>
                <button
                  type="button"
                  onClick={handleStop}
                  className="ml-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
                  aria-label="生成を停止"
                >
                  ⏹ 停止
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* エラー表示＋再試行 (P1-2) */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>{error}</span>
          {retryableQuestion && !isSending && (
            <button
              type="button"
              onClick={() => {
                const q = retryableQuestion;
                setRetryableQuestion(null);
                setError(null);
                if (q) handleSend(q);
              }}
              className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.98]"
            >
              🔁 再試行
            </button>
          )}
        </div>
      )}

      {/* 法令カテゴリセレクタ */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-700" htmlFor="law-category-select">
          検索対象
        </label>
        <select
          id="law-category-select"
          value={lawCategory}
          onChange={(e) => setLawCategory(e.target.value as LawCategoryFilter)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {LAW_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-500">
          {lawCategory === "all" ? "全法令から検索" : `${lawCategory}に絞って検索`}
        </span>
      </div>

      {/* C-001: quick-question chips above textarea — always visible for beginners */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="クイック質問例">
        {EXAMPLE_QUESTIONS.slice(0, 3).map((q) => (
          <button
            key={q}
            type="button"
            disabled={isSending}
            onClick={() => handleSend(q)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100 active:scale-[0.98] disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

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

      {/* C-005: disclaimer directly below send button, always visible on all viewports */}
      <p className="text-xs text-amber-800 leading-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <span className="font-bold">⚠ 本回答は法的助言ではありません。</span>
        　具体的な判断は必ず専門家（労働安全コンサルタント等）にご相談ください。
        最新の法令は{" "}
        <a
          href="https://laws.e-gov.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-900"
        >
          e-Gov法令検索
        </a>
        {" "}でご確認ください。
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
