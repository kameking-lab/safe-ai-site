/**
 * Chatbot 進行中の会話を同一タブのメモリだけに保持するユーティリティ。
 *
 * 再読込やタブ終了で破棄し、URL・履歴・Web Storageへ会話本文を残さない。
 * 過去バージョンが保存した値は、クリア時に削除だけ行う。
 *
 * - 保存上限はメッセージ数 50（古い user/assistant ペアから順に切り詰め）
 */

import { migrateChatbotHistory } from "@/lib/chatbot-safety";

const LEGACY_STORAGE_KEYS = [
  "anzen_chatbot_active_session_v1",
  "chatbot_history_v2",
] as const;
const MAX_MESSAGES = 50;

// モジュールインスタンスは現在のタブに閉じる。会話本文は永続化しない。
let memoryFallback: string | null = null;

function safeGet(): string | null {
  return memoryFallback;
}

function safeSet(value: string): void {
  memoryFallback = value;
}

function safeRemove(): void {
  memoryFallback = null;
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 保存領域へアクセスできない場合も、メモリ上の履歴は削除済み。
    }
  }
}

/**
 * 履歴に保存する最低限の形。各ページの ChatMessage 型はこれを extend してよい。
 */
export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  // 追加フィールド（sources / confidence / followups 等）はそのまま保持される
  [key: string]: unknown;
};

export type ChatHistoryPayload<T extends StoredChatMessage = StoredChatMessage> = {
  version: 1 | 2;
  updatedAt: number;
  messages: T[];
};

/**
 * 保存済みの会話を読み込む。失敗時は null。
 */
export function loadChatHistory<T extends StoredChatMessage = StoredChatMessage>(): T[] | null {
  const raw = safeGet();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChatHistoryPayload<T>;
    if (!parsed || ![1, 2].includes(parsed.version) || !Array.isArray(parsed.messages)) return null;
    const valid = parsed.messages.filter((m) => m && (m.role === "user" || m.role === "assistant"));
    const migrated = migrateChatbotHistory(valid);
    if (parsed.version === 1 || migrated.removedCount > 0) {
      if (migrated.messages.length === 0) safeRemove();
      else saveChatHistory(migrated.messages);
    }
    return migrated.messages;
  } catch {
    return null;
  }
}

/**
 * 会話を上書き保存する。MAX_MESSAGES を超える場合は古いメッセージから切り捨てる。
 * 0 件で呼ばれた場合は履歴自体を削除する（クリア相当）。
 */
export function saveChatHistory<T extends StoredChatMessage = StoredChatMessage>(messages: T[]): void {
  if (!messages || messages.length === 0) {
    safeRemove();
    return;
  }
  const migrated = migrateChatbotHistory(messages);
  const safeMessages = migrated.messages;
  if (safeMessages.length === 0) {
    safeRemove();
    return;
  }
  const trimmed = safeMessages.length > MAX_MESSAGES ? safeMessages.slice(-MAX_MESSAGES) : safeMessages;
  const payload: ChatHistoryPayload<T> = {
    version: 2,
    updatedAt: Date.now(),
    messages: trimmed,
  };
  safeSet(JSON.stringify(payload));
}

/**
 * 会話履歴を全削除する。「履歴をクリア」ボタンから呼ぶ。
 */
export function clearChatHistory(): void {
  safeRemove();
}

/**
 * 最後に保存された時刻（ms）。履歴サマリ表示用。null なら未保存。
 */
export function getChatHistoryUpdatedAt(): number | null {
  const raw = safeGet();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChatHistoryPayload;
    return typeof parsed.updatedAt === "number" ? parsed.updatedAt : null;
  } catch {
    return null;
  }
}

export const CHAT_HISTORY_MAX_MESSAGES = MAX_MESSAGES;
