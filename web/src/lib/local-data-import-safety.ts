import { migrateChatbotHistory, type ChatbotTextRecord } from "@/lib/chatbot-safety";
import {
  normalizeSafetyContext,
  SAFETY_CONTEXT_STORAGE_KEY,
} from "@/lib/copilot/types";

const SAVED_CHAT_KEY = "chatbot_history_v2";
const ACTIVE_CHAT_KEY = "anzen_chatbot_active_session_v1";

type ImportedSession = {
  id?: unknown;
  title?: unknown;
  savedAt?: unknown;
  messages?: unknown;
  [key: string]: unknown;
};

function isTextRecord(value: unknown): value is ChatbotTextRecord & Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ChatbotTextRecord>;
  return (record.role === "user" || record.role === "assistant") && typeof record.content === "string";
}

export function sanitizeImportedLocalDataValue(
  key: string,
  value: string,
): { value: string | null; removedCount: number } {
  try {
    if (key === SAVED_CHAT_KEY) {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return { value: null, removedCount: 1 };
      let removedCount = 0;
      const sessions = parsed.flatMap((raw): ImportedSession[] => {
        if (!raw || typeof raw !== "object") {
          removedCount += 1;
          return [];
        }
        const session = raw as ImportedSession;
        const records = Array.isArray(session.messages) ? session.messages.filter(isTextRecord) : [];
        const migrated = migrateChatbotHistory(records);
        removedCount += records.length - migrated.messages.length;
        if (migrated.messages.length === 0) return [];
        return [{
          ...session,
          title: migrated.removedCount > 0 ? "移行済みの会話" : session.title,
          messages: migrated.messages,
        }];
      });
      return { value: sessions.length > 0 ? JSON.stringify(sessions) : null, removedCount };
    }

    if (key === ACTIVE_CHAT_KEY) {
      const parsed = JSON.parse(value) as { messages?: unknown };
      const records = Array.isArray(parsed?.messages) ? parsed.messages.filter(isTextRecord) : [];
      const migrated = migrateChatbotHistory(records);
      return {
        value: migrated.messages.length > 0
          ? JSON.stringify({ ...parsed, version: 2, messages: migrated.messages, updatedAt: Date.now() })
          : null,
        removedCount: records.length - migrated.messages.length,
      };
    }

    if (key === SAFETY_CONTEXT_STORAGE_KEY) {
      const parsed = JSON.parse(value) as unknown;
      const before = Array.isArray((parsed as { recentQueries?: unknown })?.recentQueries)
        ? (parsed as { recentQueries: unknown[] }).recentQueries.length
        : 0;
      const normalized = normalizeSafetyContext(parsed);
      return {
        value: JSON.stringify(normalized),
        removedCount: Math.max(0, before - normalized.recentQueries.length),
      };
    }
  } catch {
    if (key === SAVED_CHAT_KEY || key === ACTIVE_CHAT_KEY || key === SAFETY_CONTEXT_STORAGE_KEY) {
      return { value: null, removedCount: 1 };
    }
  }
  return { value, removedCount: 0 };
}
