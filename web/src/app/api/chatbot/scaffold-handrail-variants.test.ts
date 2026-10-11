import { beforeEach, describe, expect, it } from "vitest";
import { POST as postJson } from "./route";
import { POST as postStream } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import type { ChatbotResponse } from "@/lib/chatbot-contract";
import { PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS } from "@/lib/legal-conversation-public-context";

type RoutePost = (request: Request) => Promise<Response>;

const MODES = [
  { label: "JSON", post: postJson, mode: "json" },
  { label: "SSE", post: postStream, mode: "sse" },
] as const;

const THREE_WAY = /わく組足場.*わく組以外.*開口部/;

async function ask(
  post: RoutePost,
  mode: "json" | "sse",
  message: string,
  context?: ChatbotResponse["context"],
): Promise<ChatbotResponse> {
  // ブラウザと同じく、生の会話履歴は送らず nine-key context だけを渡す。
  const response = await post(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context, privacyConfirmed: true }),
    }),
  );
  expect(response.status).toBe(200);
  const raw = await response.text();
  if (mode === "json") return JSON.parse(raw) as ChatbotResponse;
  const meta = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1];
  expect(meta).toBeDefined();
  return JSON.parse(meta!) as ChatbotResponse;
}

function visible(payload: ChatbotResponse): string {
  return [payload.directAnswer, ...payload.importantConditions].join(" ");
}

function expectPublicContextOnly(payload: ChatbotResponse) {
  const allowed = new Set<string>(PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS);
  for (const key of Object.keys(payload.context ?? {})) {
    expect(allowed.has(key), key).toBe(true);
  }
  expect(JSON.stringify(payload.context)).not.toMatch(/です|ですか|？/);
}

beforeEach(() => {
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
});

describe.each(MODES)("scaffold handrail follow-ups via $label", ({ post, mode }) => {
  it("keeps the handrail subject and frame subtype in the nine-key context", async () => {
    const first = await ask(post, mode, "足場の手すりは？");
    expect(first.clarificationQuestion ?? "").toMatch(THREE_WAY);
    expect(first.context).toEqual({ topicDomain: "fall", equipment: "足場の手すり" });
    expectPublicContextOnly(first);

    const second = await ask(post, mode, "わく組足場です", first.context);
    expect(second.source_type).toBe("rag");
    expect(visible(second)).toMatch(/手すりわく/);
    // 交さ筋かいだけでは足りない（桟・幅木と組み合わせる）ことを文面で崩さない。
    expect(second.directAnswer).toMatch(/交さ筋かいに加えて高さ15cm以上40cm以下の桟もしくは高さ15cm以上の幅木/);
    expect(visible(second)).toMatch(/15cm以上40cm以下の桟/);
    expect(visible(second)).toMatch(/妻面/);
    // 563条1項の適用範囲（高さ2m以上の作業場所・一側足場を除く）を落とさない。
    expect(second.directAnswer).toMatch(/^高さ2m以上の作業場所がある一側足場を除く足場で/);
    // 取外しを無条件に許すような例外文は出さない。
    expect(visible(second)).not.toMatch(/取り外す|取外し/);
    expect(second.directAnswer).not.toMatch(/わく組足場以外の部分には/);
    expect(second.clarificationQuestion ?? "").not.toMatch(THREE_WAY);
    expect(second.context).toEqual({
      topicDomain: "fall",
      equipment: "足場の手すり",
      confirmedChoices: ["わく組足場"],
    });
    expectPublicContextOnly(second);
    const source563 = second.sources.find((source) => /563/.test(source.article));
    expect(source563?.url).toBe("https://laws.e-gov.go.jp/law/347M50002000032");
    expect(source563?.text).toContain("（２）「手すりわく」");
  });

  it.each([
    "わく組足場以外です",
    "わく組足場以外の足場です",
    "わく組以外の足場です",
    "わく組ではありません",
    "わく組じゃないです",
    "わく組の妻面です",
    "わく組足場の妻面です",
    "単管足場です",
  ])(
    "does not confuse the non-frame reply %s with frame scaffolding",
    async (reply) => {
      const first = await ask(post, mode, "足場の手すりは？");
      const second = await ask(post, mode, reply, first.context);
      expect(second.directAnswer).toMatch(/わく組足場以外の部分には手すり等と中桟等が必要/);
      expect(second.directAnswer).toMatch(/85cm以上/);
      expect(visible(second)).not.toMatch(/手すりわく|交さ筋かい/);
      expect(second.clarificationQuestion ?? "").not.toMatch(THREE_WAY);
      expect(second.context?.confirmedChoices).toEqual(["わく組足場以外の足場"]);
      expectPublicContextOnly(second);
    },
  );

  it("routes the opening reply to the opening provision, not to scaffold subtypes", async () => {
    const first = await ask(post, mode, "足場の手すりは？");
    const second = await ask(post, mode, "作業床や開口部です", first.context);
    expect(second.directAnswer).toMatch(/開口部/);
    expect(second.directAnswer).toMatch(/囲い・手すり・覆い等/);
    expect(visible(second)).not.toMatch(/手すりわく|交さ筋かい|わく組足場以外/);
    expect(second.sources.some((source) => /519/.test(source.article))).toBe(true);
    expect(second.context?.confirmedChoices).toBeUndefined();
    expectPublicContextOnly(second);
  });

  it("accepts the common 枠組足場 spelling as the frame subtype", async () => {
    const first = await ask(post, mode, "足場の手すりは？");
    const second = await ask(post, mode, "枠組足場です", first.context);
    expect(visible(second)).toMatch(/手すりわく/);
    expect(second.context?.confirmedChoices).toEqual(["わく組足場"]);
  });

  it("drops the scaffold subtype when the user switches domain", async () => {
    const first = await ask(post, mode, "足場の手すりは？");
    const second = await ask(post, mode, "わく組足場です", first.context);
    const third = await ask(post, mode, "フォークリフトの資格は？", second.context);
    expect(third.context?.equipment).toMatch(/フォークリフト/);
    expect(third.context?.confirmedChoices ?? []).not.toContain("わく組足場");
    expect(visible(third)).not.toMatch(/手すりわく/);
  });
});
