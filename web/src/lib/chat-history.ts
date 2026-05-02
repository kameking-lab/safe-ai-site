/**
 * Chatbot 進行中の会話を localStorage に永続化するユーティリティ。
 *
 * 既存の `chatbot_history_v2`（複数の保存済みセッション一覧）とは別物で、
 * こちらは「ページを再読込しても直前の会話が残る」ための
 * 単一の現在進行形セッション用。
 *
 * - SSR 安全（typeof window で常にガード）
 * - localStorage が使えない環境（プライベートブラウジング・容量超過等）では
 *   memory フォールバックに切り替え、UI 側はそのまま使える
 * - 保存上限はメッセージ数 50（古い user/assistant ペアから順に切り詰め）
 */

const STORAGE_KEY = "anzen_chatbot_active_session_v1";
const MAX_MESSAGES = 50;

// localStorage が使えない場合の memory フォールバック（同一タブ内のみ有効）
let memoryFallback: string | null = null;

function safeGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

function safeSet(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // QuotaExceededError / SecurityError 等。memory フォールバックに切替
    memoryFallback = value;
  }
}

function safeRemove(): void {
  memoryFallback = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
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
  version: 1;
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
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.messages)) return null;
    return parsed.messages.filter((m) => m && (m.role === "user" || m.role === "assistant"));
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
  const trimmed = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  const payload: ChatHistoryPayload<T> = {
    version: 1,
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
