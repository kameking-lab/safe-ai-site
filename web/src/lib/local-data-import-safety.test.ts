import { describe, expect, it } from "vitest";
import { sanitizeImportedLocalDataValue } from "./local-data-import-safety";
import { SAFETY_CONTEXT_STORAGE_KEY } from "./copilot/types";

describe("legacy/imported AI context migration", () => {
  it("drops sensitive turns from saved and active chatbot histories", () => {
    const saved = sanitizeImportedLocalDataValue("chatbot_history_v2", JSON.stringify([{
      id: "old",
      title: "山田 太郎の相談",
      savedAt: 1,
      messages: [
        { id: "1", role: "user", content: "山田 太郎 090-1234-5678" },
        { id: "2", role: "assistant", content: "足場の一般的な確認事項です" },
      ],
    }]));
    expect(saved.removedCount).toBe(1);
    expect(saved.value).not.toContain("山田");
    expect(saved.value).not.toContain("090");

    const active = sanitizeImportedLocalDataValue("anzen_chatbot_active_session_v1", JSON.stringify({
      version: 1,
      messages: [{ id: "1", role: "user", content: "worker@example.com" }],
    }));
    expect(active.value).toBeNull();
    expect(active.removedCount).toBe(1);
  });

  it("drops sensitive imported Copilot recent queries", () => {
    const result = sanitizeImportedLocalDataValue(SAFETY_CONTEXT_STORAGE_KEY, JSON.stringify({
      recentQueries: [
        { query: "東京都新宿区西新宿2丁目8番1号", source: "chatbot", at: 1 },
        { query: "足場の点検", source: "chatbot", at: 2 },
      ],
    }));
    expect(result.removedCount).toBe(1);
    expect(result.value).not.toContain("西新宿");
    expect(result.value).toContain("足場の点検");
  });
});
