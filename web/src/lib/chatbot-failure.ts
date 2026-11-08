/**
 * /api/chatbot/stream の失敗応答を、画面に出せる1文と「再試行で直るか」に読み替える。
 *
 * 失敗応答の形は経路で違う。
 * - 未ログインのウェブ: `{ error: "文", retryable?: boolean }`
 * - ログイン済みのウェブ会員・iOSアプリ（共通利用枠 withUsage 経由）:
 *   `{ error: { code: "DAILY_LIMIT_REACHED", message: "文", ... } }`
 * 後者を前者の形で読むと、文の代わりにオブジェクトを描画して画面が落ちたり、
 * 「本日の上限」でも「回答を取得できませんでした」＋再試行を出し続けたりしていた
 * （ログイン済みの人だけチャットが壊れて見える）。
 */
export interface ChatbotFailure {
  message: string | null;
  code: string | null;
  retryable: boolean;
}

/** 再試行しても結果が変わらない（待つ・ログインする・入力を直す必要がある）もの。 */
const NOT_RETRYABLE = new Set([
  "DAILY_LIMIT_REACHED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_REQUEST",
  "SAFETY_BLOCKED",
  "CONSENT_REQUIRED",
  "AI_BUDGET_STOPPED",
  "AI_BUDGET_FREE_PAUSED",
]);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function readChatbotFailure(body: unknown): ChatbotFailure {
  if (!body || typeof body !== "object") {
    return { message: null, code: null, retryable: true };
  }
  const record = body as Record<string, unknown>;
  const nested =
    record.error && typeof record.error === "object"
      ? (record.error as Record<string, unknown>)
      : null;
  const code = text(nested?.code) ?? text(record.code);
  const message = text(nested?.message) ?? text(record.message) ?? text(record.error);
  const retryable =
    record.retryable === false || nested?.retryable === false
      ? false
      : code
        ? !NOT_RETRYABLE.has(code)
        : true;
  return { message, code, retryable };
}
