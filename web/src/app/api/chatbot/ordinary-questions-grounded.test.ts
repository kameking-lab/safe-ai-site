import { afterEach, describe, expect, it } from "vitest";
import { POST as postJson } from "./route";
import { POST as postStream } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import { normalizeLegalConversationText } from "@/lib/legal-conversation-context";
import {
  CHATBOT_UNDECODABLE_TEXT_MESSAGE,
  containsUndecodableText,
} from "@/lib/server/chatbot-request-boundary";

/**
 * 2026-11-07 incident: production looked like it answered every question with
 * the same "根拠を確認できないため、回答を保留します" hold. The routes were
 * fine; the probe sent a Shift_JIS body, which `request.json()` decoded into
 * U+FFFD and which matched no law text. These cases pin both halves: ordinary
 * occupational-safety questions stay grounded, and undecodable text is an
 * explicit 400 instead of a plausible no-hit answer.
 */

type RoutePost = (request: Request) => Promise<Response>;
type Payload = {
  answer: string;
  source_type?: string;
  safetyKind?: string;
  sources: Array<{ law: string; article: string }>;
  citations?: unknown[];
};

const NO_HIT_HOLD = "この条件に直接対応する根拠を確認できないため";

const ORDINARY_QUESTIONS = [
  {
    message: "足場の手すりの高さは何cm以上必要ですか？",
    article: /第563条|第552条/,
  },
  {
    message:
      "職場における熱中症対策の義務化について、事業者は何をしなければなりませんか",
    article: /第612条の2/,
  },
  {
    message: "フルハーネス型墜落制止用器具の特別教育は何時間ですか",
    article: /第36条|第59条/,
  },
  {
    message:
      "高さ2m以上の箇所で作業床を設ける義務について、労働安全衛生規則の条文を教えて",
    article: /第518条/,
  },
] as const;

const ROUTES = [
  { label: "JSON", post: postJson, sse: false },
  { label: "SSE", post: postStream, sse: true },
] as const;

function jsonRequest(body: BodyInit): Request {
  return new Request("http://localhost/api/chatbot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

async function call(
  post: RoutePost,
  sse: boolean,
  message: string,
): Promise<{ response: Response; payload: Payload }> {
  const response = await post(
    jsonRequest(JSON.stringify({ message, history: [], privacyConfirmed: true })),
  );
  const raw = await response.text();
  if (!sse) return { response, payload: JSON.parse(raw) as Payload };
  const encoded = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1];
  if (!encoded) throw new Error(`SSE meta event missing: ${raw.slice(0, 240)}`);
  return { response, payload: JSON.parse(encoded) as Payload };
}

afterEach(() => {
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
});

describe("ordinary occupational-safety questions are not source gaps", () => {
  it.each(ORDINARY_QUESTIONS)("safety gate passes: $message", ({ message }) => {
    for (const text of [message, normalizeLegalConversationText(message)]) {
      const decision = evaluateChatbotSafety(text);
      expect(decision?.kind ?? null).not.toBe("source-gap");
      expect(decision?.kind ?? null).not.toBe("emergency");
      expect(decision?.kind ?? null).not.toBe("privacy");
    }
  });

  for (const { label, post, sse } of ROUTES) {
    it.each(ORDINARY_QUESTIONS)(
      `${label} returns a grounded, cited answer: $message`,
      async ({ message, article }) => {
        const { response, payload } = await call(post, sse, message);
        expect(response.status).toBe(200);
        expect(payload.safetyKind).toBeUndefined();
        expect(payload.source_type).toBe("rag");
        expect(payload.answer).not.toContain(NO_HIT_HOLD);
        expect(payload.sources.length).toBeGreaterThan(0);
        expect(payload.citations?.length ?? 0).toBeGreaterThan(0);
        expect(
          payload.sources.some((source) => article.test(source.article)),
          JSON.stringify(payload.sources),
        ).toBe(true);
      },
    );
  }
});

describe("legitimate refusals still refuse", () => {
  for (const { label, post, sse } of ROUTES) {
    // Owner decision 2026-11-07: emergency wording is answered like any question, no 110/119 stop.
    it(`${label} does not intercept emergency wording`, async () => {
      const { response, payload } = await call(
        post,
        sse,
        "同僚が足場から落ちて意識がありません",
      );
      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("emergency");
      expect(payload.answer).not.toMatch(/110番|119番/);
    });

    it(`${label} keeps the privacy stop`, async () => {
      const { response, payload } = await call(
        post,
        sse,
        "小野太郎です。足場の手すり高さは？",
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("X-AI-Used")).toBe("false");
      expect(payload.safetyKind).toBe("privacy");
      expect(payload.sources).toEqual([]);
    });
  }
});

describe("non-UTF-8 request bodies", () => {
  // 「足場の手すり」を Shift_JIS / CP932 で符号化したバイト列。
  const shiftJisBody = Buffer.concat([
    Buffer.from('{"message":"', "utf8"),
    Buffer.from([0x91, 0xab, 0x8f, 0xea, 0x82, 0xcc, 0x8e, 0xe8, 0x82, 0xb7, 0x82, 0xe8]),
    Buffer.from('","history":[],"privacyConfirmed":true}', "utf8"),
  ]);

  it("detects replacement characters in message or history", () => {
    expect(containsUndecodableText(["足場の手すり"])).toBe(false);
    expect(containsUndecodableText(["��"])).toBe(true);
    expect(containsUndecodableText(["ok", undefined, "a�"])).toBe(true);
  });

  for (const { label, post } of ROUTES) {
    it(`${label} rejects a Shift_JIS body instead of answering a no-hit hold`, async () => {
      const response = await post(jsonRequest(new Uint8Array(shiftJisBody)));
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe(CHATBOT_UNDECODABLE_TEXT_MESSAGE);
    });
  }
});
