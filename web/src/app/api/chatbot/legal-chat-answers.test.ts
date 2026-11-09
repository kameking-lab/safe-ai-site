// 法令AIチャットが「答えない」問題（2026-11-09 実機）の再発防止。本物の Gemini ではなくモックで経路を確かめる。
// 何を聞くと何が返るか:
//   1. 条文が当たる質問 → 生成した回答をそのまま返す（以前は捨てて定型文にしていた）
//   2. 条文が当たらない質問 → 断らずに一般的な助言を生成し、「この回答は条文の根拠を確認できていません。」を1行添える
//   3. 同じチャットの追加質問 → 直前のやり取りをプロンプトに渡し、話題に沿って答える
//   4. 途中切れ（finishReason が STOP 以外）→ 収録条文の定型回答に切り替え、理由を警告欄に出す
//   5. AI を止めているとき → 根拠が無くても一般的な助言と根拠未確認の1行を返す（空応答にしない）
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  prompts: [] as string[],
  text: "",
  finishReason: "STOP" as string,
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (request: { contents: string }) => {
        provider.prompts.push(request.contents);
        return { text: provider.text, candidates: [{ finishReason: provider.finishReason }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 300 } };
      },
      generateContentStream: async (request: { contents: string }) => {
        provider.prompts.push(request.contents);
        return {
          async *[Symbol.asyncIterator]() {
            yield { text: provider.text.slice(0, 10) };
            yield { text: provider.text.slice(10), candidates: [{ finishReason: provider.finishReason }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 300 } };
          },
        };
      },
    };
  },
}));

import { POST as postJson } from "./route";
import { POST as postStream } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import { resetAll as resetCircuitBreakers } from "@/lib/external/circuit-breaker";
import { NO_EVIDENCE_NOTE } from "@/lib/legal-chat-ai";

type Payload = { answer: string; source_type: string; scopeWarnings?: string[] };
type Turn = { role: "user" | "assistant"; content: string };

async function ask(message: string, history?: Turn[], post = postStream): Promise<Payload> {
  const response = await post(new Request("http://localhost/api/chatbot/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, privacyConfirmed: true, ...(history ? { history } : {}) }),
  }));
  expect(response.status).toBe(200);
  const raw = await response.text();
  if (post === postJson) return JSON.parse(raw) as Payload;
  const meta = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1];
  if (!meta) throw new Error(`no meta: ${raw.slice(0, 200)}`);
  return JSON.parse(meta) as Payload;
}

const logs: string[] = [];
beforeEach(() => {
  provider.prompts = [];
  provider.finishReason = "STOP";
  logs.length = 0;
  vi.spyOn(console, "info").mockImplementation((line: unknown) => { logs.push(String(line)); });
  vi.stubEnv("VERCEL_ENV", "development");
  vi.stubEnv("SAFE_AI_STAGING_MODE", "false");
  vi.stubEnv("LEGAL_CHAT_AI_ENABLED", "true");
  vi.stubEnv("GEMINI_API_KEY", "legal-chat-test-key");
  vi.stubEnv("MOBILE_LEDGER_ENABLED", "false");
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
  resetCircuitBreakers();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
  resetCircuitBreakers();
});

describe("法令AIチャットは必ず何かしら答える", () => {
  it("条文が当たる質問には生成した回答をそのまま返す", async () => {
    provider.text = "高さ2m以上の作業床の端には手すり等の囲いが必要です（安衛則第519条）。";
    const payload = await ask("足場の手すりの高さは？");
    expect(payload.answer).toContain("手すり等の囲いが必要です");
    expect(payload.answer).not.toContain(NO_EVIDENCE_NOTE);
    const log = logs.find((l) => l.includes("legal_chat_generation"));
    expect(log && JSON.parse(log)).toMatchObject({ route: "stream", finishReason: "STOP", usedGeneratedText: true, promptTokens: 900, outputTokens: 300 });
  });

  it("条文が当たらない質問でも断らず、一般的な助言＋根拠未確認の1行を返す", async () => {
    provider.text = "一般論として、作業前に危険の洗い出しを行い、保護具を着用してください。";
    const payload = await ask("休憩室のエアコンの温度は何度がいい？");
    expect(payload.answer).toContain("危険の洗い出し");
    expect(payload.answer).toContain(NO_EVIDENCE_NOTE);
    expect(provider.prompts.at(-1)).toMatch(/断ったり「わかりません」で終えたりせず|直接規定する条文/);
  });

  it("同じチャットの追加質問には、直前のやり取りを渡して話題に沿って答える", async () => {
    provider.text = "その場合も、開口部には手すりか覆いを設けてください。";
    const history: Turn[] = [
      { role: "user", content: "足場の手すりの高さは？" },
      { role: "assistant", content: "85cm以上の手すりが必要です。" },
    ];
    const payload = await ask("じゃあ開口部はどうする？", history);
    expect(payload.answer).toContain("開口部には手すりか覆い");
    const prompt = provider.prompts.at(-1) ?? "";
    expect(prompt).toContain("【これまでの会話（同じチャット）】");
    expect(prompt).toContain("足場の手すりの高さは？");
    expect(prompt).toContain("じゃあ開口部はどうする？");
  });

  it("途中で切れた回答（MAX_TOKENS）は見せず、収録条文の案内に切り替えて理由を出す", async () => {
    provider.text = "高さ2m以上の作業床の端には手すり等の";
    provider.finishReason = "MAX_TOKENS";
    const payload = await ask("足場の手すりの高さは？");
    expect(payload.answer).not.toBe(provider.text);
    expect((payload.scopeWarnings ?? []).join(" ")).toContain("MAX_TOKENS");
    const log = logs.find((l) => l.includes("legal_chat_generation"));
    expect(log && JSON.parse(log)).toMatchObject({ finishReason: "MAX_TOKENS", usedGeneratedText: false });
  });

  it("JSON 経路も生成回答を返し、追加質問の履歴を渡す", async () => {
    provider.text = "フルハーネス型の墜落制止用器具を使ってください（安衛則第518条）。";
    const payload = await ask("高所作業の安全帯は？", [{ role: "user", content: "足場で作業します" }, { role: "assistant", content: "承知しました。" }], postJson);
    expect(payload.answer).toContain("フルハーネス");
    expect(provider.prompts.at(-1)).toContain("足場で作業します");
  });

  it("AI を止めているときも、根拠が無い質問に一般的な助言と根拠未確認の1行を返す", async () => {
    vi.stubEnv("LEGAL_CHAT_AI_ENABLED", "false");
    const payload = await ask("明日の東京の天気は？");
    expect(provider.prompts).toHaveLength(0);
    expect(payload.answer).toContain("一般的な安全上の目安");
    expect(payload.answer).toContain(NO_EVIDENCE_NOTE);
  });
});
