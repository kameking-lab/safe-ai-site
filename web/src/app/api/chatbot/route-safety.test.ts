import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postJson } from "./route";
import { POST as postStream } from "./stream/route";
import { VERIFIED_LEGAL_SOURCE_VERSION } from "@/data/laws/verified-corpus";
import {
  __resetChatbotCacheForTests,
  cacheKey,
  setCachedResponse,
} from "@/lib/chatbot-cache";
import { CHATBOT_UNANSWERABLE_FALLBACK } from "@/lib/chatbot-contract";
import { LEGAL_GENERATION_ENABLED } from "@/lib/chatbot-generation-policy";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import {
  PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS,
  type PublicLegalConversationContext,
} from "@/lib/legal-conversation-public-context";

type RoutePost = (request: Request) => Promise<Response>;
type RoutePayload = {
  answer: string;
  substantiveAnswer: string;
  assumptions: string[];
  conditions: string[];
  clarificationQuestion: string | null;
  quickReplies: Array<{ label: string; prompt: string }>;
  sources: Array<{
    law: string;
    article: string;
    item?: string;
    paragraph?: string;
    effectiveOn?: string;
    asOf?: string;
    applicationStatus?: "current" | "future" | "past" | "unknown";
    text?: string;
    snippet?: string;
    sourceKind?: string;
    verificationStatus?: string;
    sourceFetchedAt?: string;
    humanReviewStatus?: string;
  }>;
  safetyKind?: string;
  clarification?: { question: string; options: string[] };
  source_type?: string;
  citations?: unknown[];
  effectiveDateStatus?: {
    status: "current" | "future" | "past" | "unknown";
    asOf: string | null;
  };
  notices?: Array<{
    id: string;
    sourceUrl: string;
    pdfUrl: string | null;
  }>;
  attachedNotices?: Array<{
    id: string;
    noticeNumber: string | null;
    issuedDateRaw: string | null;
    sourceUrl: string;
    pdfUrl: string | null;
    detailUrl: string;
    source: "A" | "B" | "C";
    evidenceRole: "related-material";
    locator: string | null;
    excerpt: string | null;
    independentlyCheckedAt: string | null;
  }>;
  attachedLeaflets?: unknown[];
  context?: PublicLegalConversationContext;
};

function expectAnswerFirst(payload: RoutePayload) {
  expect(payload.substantiveAnswer.trim().length).toBeGreaterThan(0);
  expect(payload.substantiveAnswer).not.toBe(CHATBOT_UNANSWERABLE_FALLBACK);
  expect(payload.answer).toContain(payload.substantiveAnswer);
  expect(payload.substantiveAnswer).not.toBe(payload.clarificationQuestion);
  expect(payload.conditions.length).toBeLessThanOrEqual(3);
  expect(payload.quickReplies.length).toBeLessThanOrEqual(3);
  expect(payload.clarification?.options.length ?? 0).toBeLessThanOrEqual(3);
  expect(
    payload.clarificationQuestion?.match(/？|\?/g)?.length ?? 0,
  ).toBeLessThanOrEqual(1);
  expect(
    Object.keys(payload.context ?? {}).every((key) =>
      PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS.includes(
        key as (typeof PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS)[number],
      ),
    ),
  ).toBe(true);
}

function source(...parts: string[]) {
  return readFileSync(
    join(process.cwd(), "src", "app", "api", "chatbot", ...parts),
    "utf8",
  );
}

function sharedSource() {
  return readFileSync(
    join(process.cwd(), "src", "lib", "chatbot-route-shared.ts"),
    "utf8",
  );
}

async function callRoute(
  post: RoutePost,
  mode: "json" | "sse",
  message: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>,
  context?: Record<string, unknown>,
): Promise<{ response: Response; payload: RoutePayload; raw: string }> {
  const response = await post(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        context,
        privacyConfirmed: true,
      }),
    }),
  );
  const raw = await response.text();
  if (mode === "json") {
    return {
      response,
      payload: JSON.parse(raw) as RoutePayload,
      raw,
    };
  }
  const matches = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)];
  const encoded = matches.at(-1)?.[1];
  if (!encoded) throw new Error(`SSE meta event missing: ${raw.slice(0, 240)}`);
  return {
    response,
    payload: JSON.parse(encoded) as RoutePayload,
    raw,
  };
}

const executableRouteModes = [
  { label: "JSON", post: postJson, mode: "json" },
  { label: "SSE", post: postStream, mode: "sse" },
] as const;

function hasLegalSource(
  payload: RoutePayload,
  lawPattern: RegExp,
  articlePattern: RegExp,
): boolean {
  return payload.sources.some(
    ({ law, article }) => lawPattern.test(law) && articlePattern.test(article),
  );
}

function expectSupportedAsbestosParagraphSource(payload: RoutePayload) {
  const paragraph = payload.sources.find((item) => item.paragraph === "第4項");
  expect(paragraph).toBeDefined();
  expect(paragraph?.snippet).toContain("第4項");
  expect(paragraph?.snippet).toContain("必要な知識を有する者");
  expect(paragraph?.text).toContain("必要な知識を有する者");
  expect(paragraph?.item).toBeUndefined();
  expect(paragraph?.snippet).not.toContain("第4号");
  expect(paragraph?.snippet).not.toMatch(/^事業者は、?建築物/);
}

function expectVerifiedHeatNoticeAttachment(payload: RoutePayload) {
  expect(payload.attachedNotices).toHaveLength(1);
  expect(payload.attachedNotices?.[0]).toMatchObject({
    id: "mhlw-notice-0014",
    noticeNumber: "基発0520第6号",
    issuedDateRaw: "令和7年5月20日",
    source: "A",
    evidenceRole: "related-material",
    sourceUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
    pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    locator: "PDF 2ページ 第3 1(1)イ",
    independentlyCheckedAt: "2026-08-02",
  });
  expect(payload.attachedNotices?.[0]?.excerpt).toContain(
    "湿球黒球温度（WBGT）が28度以上",
  );
  expect(
    payload.attachedNotices?.every(
      (notice) => notice.id === "mhlw-notice-0014",
    ),
  ).toBe(true);
  expect(
    payload.notices?.every((notice) => notice.id === "mhlw-notice-0014") ??
      true,
  ).toBe(true);
}

describe.each([
  ["JSON", `${source("route.ts")}\n${sharedSource()}`],
  ["SSE", source("stream", "route.ts")],
])("chatbot %s route safety boundary", (_name, text) => {
  it("keeps unverified generative legal answers feature-flagged off", () => {
    expect(text).toContain("GENERATIVE_LEGAL_ANSWERS_ENABLED");
    if (_name === "JSON") {
      expect(text).toContain("LEGAL_GENERATION_ENABLED");
      expect(LEGAL_GENERATION_ENABLED).toBe(false);
    }
    const provider = text.indexOf("new GoogleGenAI");
    const disabledCheck = text.lastIndexOf(
      "!GENERATIVE_LEGAL_ANSWERS_ENABLED",
      provider,
    );
    expect(disabledCheck).toBeGreaterThan(0);
    expect(disabledCheck).toBeLessThan(provider);
  });

  it("evaluates safety before rate limiting, retrieval, cache, and model access", () => {
    const guard = text.indexOf(
      "const directSafety = evaluateChatbotSafety(message)",
    );
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(
      text.indexOf("checkRateLimit(getClientIp(request))", guard),
    );
    expect(guard).toBeLessThan(
      text.indexOf("searchRelevantArticlesWithScore(retrievalQuery", guard),
    );
    expect(guard).toBeLessThan(text.indexOf("getCachedResponse", guard));
  });

  it("returns a deterministic no-source review-required payload", () => {
    const guardBlock = text.slice(
      text.indexOf("const directSafety = evaluateChatbotSafety(message)"),
      text.indexOf("checkRateLimit(getClientIp(request))"),
    );
    expect(guardBlock).toContain("answer: safety.response");
    expect(guardBlock).not.toContain("substantiveAnswer: safety.response");
    expect(guardBlock).toContain("sources: []");
    expect(guardBlock).toContain("requiresHumanReview: true");
  });
});

describe("chatbot route executable safety boundary", () => {
  afterEach(() => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(executableRouteModes)(
    "実行時計が監査日を超えても回答・出典を2026-08-09基準に固定する ($label)",
    async ({ post, mode }) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));

      const current = await callRoute(post, mode, "酸欠作業の監視人は必要？");
      expect(current.response.status).toBe(200);
      expectAnswerFirst(current.payload);
      expect(current.payload.answer).toContain("回答基準日: 2026-08-09 JST");
      expect(current.payload.answer).not.toContain("2030-01-01");
      expect(current.payload.sources.length).toBeGreaterThan(0);
      expect(
        current.payload.sources.every((item) => item.asOf === "2026-08-09"),
      ).toBe(true);

      const future = await callRoute(
        post,
        mode,
        "2026年8月10日時点の足場の手すり高さは？",
      );
      expect(future.response.status).toBe(200);
      expect(future.payload.answer).toContain("回答基準日: 2026-08-09 JST");
      expect(future.payload.answer).toContain("回答を保留");
      expect(future.payload.sources).toEqual([]);
    },
  );

  it("実行時計が進んでもJSONのキャッシュキーは監査済み基準日で安定する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T00:00:00.000Z"));
    const message = "酸欠作業の監視人は必要？";

    const first = await callRoute(postJson, "json", message);
    expect(first.response.headers.get("X-Cache-Hit")).toBe("false");
    expect(first.payload.answer).toContain("回答基準日: 2026-08-09 JST");

    vi.setSystemTime(new Date("2026-08-08T01:00:00.000Z"));
    const second = await callRoute(postJson, "json", message);
    expect(second.response.headers.get("X-Cache-Hit")).toBe("true");
    expect(second.payload.answer).toContain("回答基準日: 2026-08-09 JST");
    expect(
      second.payload.sources.every((item) => item.asOf === "2026-08-09"),
    ).toBe(true);
  });

  it.each([postJson, postStream])(
    "rejects non-JSON and explicit cross-origin requests before body parsing (%s)",
    async (post) => {
      const nonJson = await post(
        new Request("https://www.anzen-ai-portal.jp/api/chatbot", {
          method: "POST",
          headers: {
            "content-type": "text/plain",
            origin: "https://www.anzen-ai-portal.jp",
          },
          body: JSON.stringify({
            message: "足場の点検方法は？",
            privacyConfirmed: true,
          }),
        }),
      );
      expect(nonJson.status).toBe(415);

      const crossOrigin = await post(
        new Request("https://www.anzen-ai-portal.jp/api/chatbot", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://attacker.example",
            "sec-fetch-site": "cross-site",
          },
          body: JSON.stringify({
            message: "足場の点検方法は？",
            privacyConfirmed: true,
          }),
        }),
      );
      expect(crossOrigin.status).toBe(403);
    },
  );

  it.each(executableRouteModes)(
    "2030年の安衛則563条は現行回答にせず保留する ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "2030年1月1日の安衛則第563条の義務は？",
      );
      expect(payload.source_type).toBe("safety");
      expect(payload.answer).toContain("将来時点");
      expect(payload.answer).toContain("回答を保留");
      expect(payload.sources).toEqual([]);
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "blocks emergency before any external model network on %s",
    async (post, _mode) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const response = await post(
        new Request("http://localhost/api/chatbot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: "呼吸がありません",
            privacyConfirmed: true,
          }),
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-ai-used")).toBe("false");
      expect(await response.text()).toContain("119");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "同僚が意識を失った相談は通常回答へ流さず119を示す ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "同僚が意識を失って倒れた。どうしたらいい？",
      );
      expect(payload.safetyKind).toBe("emergency");
      expect(payload.source_type).toBe("safety");
      expect(payload.answer).toContain("119");
      expect(payload.sources).toEqual([]);
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "blocks PII before any external model network on %s",
    async (post, _mode) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const response = await post(
        new Request("http://localhost/api/chatbot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: "連絡先 worker@example.com の資格を確認して",
            privacyConfirmed: true,
          }),
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-ai-used")).toBe("false");
      const body = await response.text();
      expect(body).toContain("個人情報");
      expect(body).not.toContain("worker@example.com");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "ラベルなし氏名と本人の健康情報を外部送信前に遮断する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      for (const sensitiveInput of [
        "小野太郎です。足場の手すり高さは？",
        "小野太郎です 足場の手すり高さは？",
        "小野太郎です、足場の手すり高さは？",
        "私は妊娠しています。高所作業の制限は？",
        "妊娠中です。高所作業はできますか？",
        "持病があります。高所作業は？",
        "小野太郎が作業します。フルハーネスは必要？",
        "山川健二は運転を担当します。資格は？",
        "作業員Aは妊娠中です。高所作業はできますか？",
        "同僚は妊娠中です。配置制限は？",
        "小野太郎がフォークリフトを運転します。資格は？",
        "山川健二の資格は何ですか？",
        "小野太郎、足場作業を担当します",
        "妊娠しています。高所作業はできますか？",
        "腰痛があります。重量物を扱えますか？",
        "睡眠薬を飲んでいます。運転できますか？",
        "同僚はアレルギーがあります。薬品作業は？",
        "小野太郎にフルハーネスを支給します。",
        "小野太郎をフォークリフト担当にします。資格は？",
        "作業指揮者は小野太郎です。フォークリフトの速度も教えて",
        "作業指揮者：小野太郎です。フォークリフトの速度も教えて",
        "山川健二へ技能講習の案内を出します",
        "小野太郎と山川健二が作業します",
        "妊娠してます。高所作業はできますか？",
        "薬を飲んでます。運転できますか？",
        "アレルギー持ちです。薬品作業は？",
        "腰痛持ちです。重量物を扱えますか？",
        "薬を服用しています。運転していい？",
        "サトウタロウがフォークリフトを運転します。資格は？",
        "私、腰が痛くて薬を飲みました。高所作業はできますか？",
        "新宿区西新宿2-8-1の現場です",
        "健康診断でHIV陽性と分かりました",
        "本人は「HIV陽性です」と話しました。",
        "私は「HIV陽性です」と話しました。",
        "「私はHIV陽性です」と申告しました。",
        "同僚が「HIV陽性です」と言いました。",
        "私はHIV陽性です\n別件はHIVという訓練用の例文です。",
        "研修用の例文です。「HIV陽性です」\n実際には田中さんがHIV陽性です。",
        "例文：「HIV陽性です」。なお本人の診断はHIV陽性です。",
        "訓練文は「HIV陽性です」です。しかし実際には本人がHIV陽性です。",
        "マニュアル例は「HIV陽性です」。実際の本人はB型肝炎に感染しています。",
        "教材文は「HIV陽性です」；現実には本人のHIV検査結果が陽性でした。",
        "ケース例：「HIV陽性です」。実際に同僚からHIV陽性と報告がありました。",
        "本人からHIV陽性と報告がありました。",
        "同僚からHBV陽性と報告がありました。",
        "同僚からHCV陽性と報告がありました。",
        "例文は「HIV陽性です」です。同僚からHCV陽性と報告がありました。",
        "ところが本人の検査結果はHIV陽性でした。",
        "現場では同僚が「私はHIV陽性です」と話しました。",
        "教材文は「HIV陽性です」。ところが本人の検査結果はHIV陽性でした。",
        "研修用の例文です。「HIV陽性です」：実際には本人がHIV陽性です。",
      ]) {
        const { response, payload } = await callRoute(
          post,
          mode,
          sensitiveInput,
        );
        expect(response.status).toBe(200);
        expect(payload.safetyKind).toBe("privacy");
        expect(payload.answer).toContain("個人情報");
        expect(JSON.stringify(payload)).not.toContain(sensitiveInput);
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "緊急口語を外部送信前に遮断して通常回答へ流さない ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      for (const emergencyInput of [
        "同僚が倒れてる。どうすれば？",
        "人が倒れてます。助けて",
        "作業員が気を失いました。どうすれば？",
        "同僚が気絶しています。助けて",
        "作業員が息ができない。どうすれば？",
        "同僚が息苦しい。助けて",
        "作業員が呼吸困難です。どうしたらいい？",
        "同僚が窒息しています。助けて",
        "作業員がぐったりして呼びかけに応じません",
        "同僚が胸が苦しい。どうすれば？",
        "血が噴き出して止まりません。助けて",
        "人が倒れて起きません。どうすれば？",
        "作業員が倒れ込んで動きません",
        "作業員が心停止です。助けて",
        "同僚の脈がありません。どうすれば？",
        "救急車を呼んでください。作業員が苦しんでいます",
        "同僚の唇が紫で呼吸が浅いです",
        "作業員が倒れて返答ありません。どうする？",
        "胸を締め付けられるように痛がっています。",
        "今、作業員が倒れて反応がありません、別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません\n別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません\u2028別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません\u2029別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません\t別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません：別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません／別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません・別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません｜別件で「頭を打ったら119」という訓練用の例文です。",
        "今、作業員が倒れて反応がありません  別件で「頭を打ったら119」という訓練用の例文です。",
        "「意識がありません」という訓練用の例文です。今、作業員が倒れて反応がありません。",
        "「意識がありません」という訓練用の例文です、今、作業員が倒れて反応がありません。",
        "「意識がありません」という訓練用の例文です；今、作業員が倒れて反応がありません。",
      ]) {
        const { response, payload } = await callRoute(
          post,
          mode,
          emergencyInput,
        );
        expect(response.status).toBe(200);
        expect(payload.safetyKind).toBe("emergency");
        expect(payload.answer).toContain("119");
        expect(payload.sources).toEqual([]);
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "事故非発生・明示的な訓練シナリオを実緊急と誤判定しない ($label)",
    async ({ post, mode }) => {
      for (const input of [
        "作業員が倒れて反応がない事故は発生していません。",
        "作業員が倒れて反応がない事故は起きていません。",
        "作業員が倒れて反応がない事故はありません。",
        "作業員が倒れて反応がない事故は起こりませんでした。",
        "作業員が倒れて反応がない事故は確認されていません。",
        "作業員が倒れて反応がありません、という救護訓練のシナリオです。",
        "作業員が倒れて反応がありません、という模擬訓練です。",
        "作業員が倒れて反応がありません、という演習用シナリオです。",
        "作業員が倒れて反応がありません、というケーススタディです。",
        "作業員が倒れて反応がありません、という机上演習です。",
        "作業員が倒れて反応がありません、という練習問題です。",
        "作業員が倒れて反応がありません、というデモンストレーションです。",
        "作業員が倒れて反応がありません、というドリルです。",
        "作業員がクレーンに挟まれた想定の机上演習です。",
        "作業員が倒れた場合の練習問題です。",
        "作業員が倒れた想定のドリルです。",
        "作業員がクレーンに挟まれた想定で訓練します。",
        "もし作業員がクレーンに挟まれた場合はどうする？",
        "作業員が意識不明になった事故は発生していません。",
        "作業員が倒れた場合の救護手順を教えて。",
      ]) {
        const { payload } = await callRoute(post, mode, input);
        expect(payload.safetyKind).not.toBe("emergency");
        expect(payload.answer).not.toContain("直ちに119番");
      }
    },
  );

  it.each(executableRouteModes)(
    "感染症の仮定質問・明示的な研修例文を個人健康情報と誤判定しない ($label)",
    async ({ post, mode }) => {
      for (const input of [
        "「HIV陽性だと分かりました」という訓練用の例文です",
        "HIV陽性だと分かった場合の対応を教えて",
        "私はHIV陽性です、という研修用の例文です。",
        "私はHIV陽性です、というマニュアル用の例文です。",
        "私はHIV陽性です、という演習用の例文です。",
        "私はHIV陽性です、というサンプル文です。",
        "訓練文は「HIV陽性です」。",
        "マニュアル例は「HIV陽性です」。",
        "教材文は「HIV陽性です」。",
        "ケース例：「HIV陽性です」。",
      ]) {
        const { payload } = await callRoute(post, mode, input);
        expect(payload.safetyKind).not.toBe("privacy");
        expect(payload.answer).not.toContain("個人情報を除いて");
      }
    },
  );

  it.each(executableRouteModes)(
    "電気主任技術者の制度質問を氏名PIIと誤判定しない ($label)",
    async ({ post, mode }) => {
      for (const input of [
        "電気主任技術者がいれば作業できる？",
        "電気主任技術者と電気工事士の違い",
        "高圧の点検は主任技術者の立会いだけでいい？",
        "主任技術者がいればいい？",
      ]) {
        const { payload } = await callRoute(post, mode, input);
        expect(payload.safetyKind).not.toBe("privacy");
        expect(payload.answer).not.toContain("個人情報を除いて");
      }
    },
  );

  it.each(executableRouteModes)(
    "対象外法令を別の収録法令で代用せず外部送信前に保留する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { response, payload } = await callRoute(
        post,
        mode,
        "民法の契約解除について教えて",
      );

      expect(response.status).toBe(200);
      expect(payload.safetyKind).toBe("source-gap");
      expect(payload.source_type).toBe("safety");
      expect(payload.answer).toContain("別の法令で代用せず回答を保留");
      expect(payload.sources).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "AI OFFでも対象不明の車検・年次点検を無関係条文へ着地させない ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      for (const testCase of [
        {
          question: "フォークリフトの車検の期限は？",
          answerMarker: "道路運送車両法側",
          clarificationMarker: "公道走行の車検・年次自主検査・月次自主検査",
        },
        {
          question: "年次点検の義務はありますか？",
          answerMarker: "設備・機械の種類によって",
          clarificationMarker: "対象設備・機械の名称",
        },
      ]) {
        const { response, payload } = await callRoute(
          post,
          mode,
          testCase.question,
        );
        expect(response.status).toBe(200);
        expectAnswerFirst(payload);
        expect(payload.safetyKind).toBe("scope-hold");
        expect(payload.source_type).toBe("safety");
        expect(payload.substantiveAnswer).toContain(testCase.answerMarker);
        expect(payload.clarificationQuestion).toContain(
          testCase.clarificationMarker,
        );
        expect(payload.sources).toEqual([]);
        expect(payload.citations).toEqual([]);
        expect(payload.quickReplies).toEqual([]);
        expect(JSON.stringify(payload)).not.toMatch(
          /第36条(?:第5号|5号)?|第663条の2/,
        );
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "生成AI OFF時は外部送信せず、根拠候補または保留をAI推論と表示しない (%s)",
    async (post, mode) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const { response, payload } = await callRoute(
        post,
        mode,
        "足場の点検方法を確認したい",
      );
      expect(response.status).toBe(200);
      expect(payload.answer).toContain("結論");
      expect(payload.answer).toContain("根拠");
      expect(payload.answer).toMatch(/回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST/);
      expect(
        (payload as RoutePayload & { source_type?: string }).source_type,
      ).not.toBe("ai_inference");
      expect(payload.answer).not.toContain("本回答はAIによる情報提供");
      expect(payload.answer).not.toContain("生成AI回答は停止中");
      expect(payload.answer.length).toBeLessThanOrEqual(640);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "生成AI OFFの$label抽出回答で安衛則612条の2に確認済み通達を関連資料として添付する",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { response, payload } = await callRoute(
        post,
        mode,
        "熱中症の報告体制は義務？",
      );

      expect(response.status).toBe(200);
      expect(
        hasLegalSource(payload, /労働安全衛生規則|安衛則/, /第612条の2/),
      ).toBe(true);
      expect(payload.answer).toContain("結論");
      expectVerifiedHeatNoticeAttachment(payload);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "$labelで一次資料照合済み通達が見つかる質問を一般的な資料不足確認へ戻さない",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { response, payload } = await callRoute(
        post,
        mode,
        "WBGT（暑さ指数）に基づく熱中症予防対策はどの通達？",
      );

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("source-gap");
      expectAnswerFirst(payload);
      expect(
        hasLegalSource(payload, /労働安全衛生規則|安衛則/, /第612条の2/),
      ).toBe(true);
      expectVerifiedHeatNoticeAttachment(payload);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "$labelで未確認の明示条文へ熱中症キーワードだけで関連資料を添付しない",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { response, payload, raw } = await callRoute(
        post,
        mode,
        "安衛則第999条の熱中症義務は？",
      );

      expect(response.status).toBe(200);
      expect(payload.sources).toEqual([]);
      expect(payload.citations).toEqual([]);
      expect(payload.attachedNotices ?? []).toEqual([]);
      expect(payload.attachedLeaflets ?? []).toEqual([]);
      expect(payload.notices ?? []).toEqual([]);
      expect(raw).not.toContain("mhlw-notice-");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "緊急・PII以外の曖昧判定より将来時点の保留を優先する (%s)",
    async (post, mode) => {
      const { payload } = await callRoute(
        post,
        mode,
        "2032年の玉掛け資格区分を教えて",
      );
      expect(payload.answer).toContain("将来時点");
      expect(payload.answer).toContain("回答を保留");
      expect(payload.safetyKind).not.toBe("ambiguous");
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "PF-012-FUTURE-GUARD: 将来前提は検索・生成前に保留する (%s)",
    async (post, mode) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const { response, payload } = await callRoute(
        post,
        mode,
        "2030年4月1日に施行予定の事業者義務を教えてください",
      );
      expect(response.status).toBe(200);
      expect(payload.answer).toContain("将来時点の法令内容");
      expect(payload.answer).toContain("回答を保留");
      expect(payload.answer).toMatch(/回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST/);
      expect(payload.sources).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "PF-012-CONTEXT: 文脈確認の法令応答にも基準日を付ける (%s)",
    async (post, mode) => {
      for (const context of [undefined, {}]) {
        const { response, payload } = await callRoute(
          post,
          mode,
          "それについて詳しく",
          undefined,
          context,
        );
        expect(response.status).toBe(200);
        expect(payload.answer).toContain("前の会話内容を確認できない");
        expect(payload.answer).toMatch(
          /回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST/,
        );
      }
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "確認質問への回答を履歴の曖昧判定で遮断せず、%s 経路で資格回答まで進める",
    async (post, mode) => {
      const { response, payload } = await callRoute(post, mode, "1トン以上", [
        { role: "user", content: "フォークリフトに資格いる？" },
        {
          role: "assistant",
          content: "フォークリフトの最大荷重はどれですか？",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toContain("最大荷重1トン以上");
      expect(payload.answer).toContain("技能講習");
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.answer).not.toContain("次の質問");
      expect(payload.answer).not.toContain("設備の種類・高さ・荷重");
      expect(payload.sources.length).toBeGreaterThan(0);
      expect(
        payload.sources.some((item) => item.article.includes("第20条")),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "P1-MULTITURN-FORKLIFT: 1.7トンを最大荷重1トン以上の技能講習へ結び、安衛法61条・安衛令20条を示す ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "1.7トン", [
        { role: "user", content: "フォークリフトに資格いる？" },
        {
          role: "assistant",
          content: "フォークリフトの最大荷重はどれですか？",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toMatch(/最大荷重.*1トン以上/);
      expect(payload.answer).toContain("技能講習");
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.answer).not.toContain("次の質問");
      expect(payload.answer).not.toContain("設備の種類・高さ・荷重");
      expect(
        hasLegalSource(payload, /^(?:労働安全衛生法|安衛法)$/, /第61条/),
      ).toBe(true);
      expect(
        hasLegalSource(payload, /^(?:労働安全衛生法施行令|安衛令)$/, /第20条/),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "P2-MULTITURN-FORKLIFT-BELOW-1T: 0.8トンを特別教育へ結び、次は道路走行だけを確認する ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "0.8トン", [
        { role: "user", content: "フォークリフトに資格いる？" },
        {
          role: "assistant",
          content: "フォークリフトの最大荷重はどれですか？",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toMatch(/最大荷重.*1トン未満/);
      expect(payload.answer).toContain("特別教育");
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.answer).not.toContain("次の質問");
      expect(payload.answer).not.toContain("設備の種類・高さ・荷重");
      expect(
        hasLegalSource(payload, /^(?:労働安全衛生法|安衛法)$/, /第59条/),
      ).toBe(true);
      expect(
        hasLegalSource(payload, /^(?:労働安全衛生規則|安衛則)$/, /第36条/),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "P1-FULL-HARNESS-EDUCATION-DIRECT: 明示された特別教育質問を墜落場所へ誤分岐しない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(
        post,
        mode,
        "フルハーネス型墜落制止用器具の特別教育はいつ必要？",
      );

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.clarification?.question).not.toBe(
        "墜落のおそれがある場所はどこですか？",
      );
      expect(payload.answer).toMatch(/特別教育|高さ.*2メートル|作業床/);
      expect(hasLegalSource(payload, /労働安全衛生規則|安衛則/, /第36条/)).toBe(
        true,
      );
    },
  );

  it.each(executableRouteModes)(
    "P1-MULTITURN-FULL-HARNESS: 作業床なしの追答でもフルハーネスの論点を維持する ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "作業床なし", [
        { role: "user", content: "フルハーネスはいつ必要？" },
        { role: "assistant", content: "作業床を設けられますか？" },
      ]);
      const conversationText = `${payload.answer}\n${payload.clarification?.question ?? ""}`;

      expect(response.status).toBe(200);
      expect(conversationText).toMatch(/フルハーネス|墜落制止用器具|高さ/);
      expect(conversationText).not.toContain("どの作業床を確認しますか");
      expect(conversationText).not.toContain(
        "どの作業・設備について知りたいですか",
      );
      expect(payload.answer).not.toContain(
        "この条件に直接対応する根拠を確認できないため、回答を保留します",
      );
      expect(payload.answer).toContain(
        "一律にフルハーネス型と決まるわけではありません",
      );
      expect(payload.answer).not.toContain("特別教育が必要です");
      expect(
        hasLegalSource(payload, /労働安全衛生規則|安衛則/, /第518条/),
      ).toBe(true);
      expect(
        hasLegalSource(payload, /労働安全衛生規則|安衛則/, /第519条/),
      ).toBe(true);
      expect(payload.answer).toContain(
        "次の質問\n作業する高さを教えてください",
      );
      expect(payload.answer).not.toContain("作業する高さと、作業床");
      if (payload.clarification) {
        expect(
          payload.clarification.question.match(/？|\?/g)?.length ?? 0,
        ).toBeLessThanOrEqual(1);
      }
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-FULL-HARNESS: 2010年を追答後も保持し、現行の特別教育要件を当時義務にしない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "作業床なし", [
        {
          role: "user",
          content:
            "2010年8月2日にフルハーネス型を使う作業には特別教育が必要でしたか?",
        },
        { role: "assistant", content: "作業床を設けられますか?" },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toContain("当時の義務は確定できません");
      expect(payload.answer).toContain("2010-08-02・当時未施行");
      expect(payload.answer).not.toContain("特別教育が必要です");
      expect(
        payload.sources.some(
          (item) =>
            item.item === "第41号" &&
            item.effectiveOn?.includes("平成31年2月1日") &&
            item.applicationStatus === "future",
        ),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-ERA: 平成30年を追答後も保持し、現行の特別教育要件を当時義務にしない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "作業床なし", [
        {
          role: "user",
          content:
            "平成30年にフルハーネス型を使う作業には特別教育が必要でしたか?",
        },
        { role: "assistant", content: "作業床を設けられますか?" },
      ]);

      expect(response.status).toBe(200);
      expect(payload.answer).toContain("当時の義務は確定できません");
      expect(payload.answer).toContain("2018・当時未施行");
      expect(payload.answer).not.toContain("特別教育が必要です");
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-YEAR-BOUNDARY: 2019年を2月1日の前後に分け、日付を一問だけ確認する ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "作業床なし", [
        {
          role: "user",
          content:
            "2019年にフルハーネス型を使う作業には特別教育が必要でしたか?",
        },
        { role: "assistant", content: "作業床を設けられますか?" },
      ]);

      expect(response.status).toBe(200);
      expect(payload.answer).toContain("2019-02-01から施行");
      expect(payload.answer).toContain("指定期間のそれ以前");
      expect(payload.answer).toContain("次の質問\n対象の日付を教えてください");
      expect(payload.answer).not.toContain("特別教育が必要です");
      expect(payload.answer).not.toContain("2019・当時未施行");
    },
  );

  it.each(executableRouteModes)(
    "P1-MULTITURN-MOBILE-CRANE: 3.2トンは小型移動式クレーン技能講習とし、固定クレーンの22条を混ぜない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "3.2トン", [
        { role: "user", content: "移動式クレーンの資格は？" },
        {
          role: "assistant",
          content: "移動式クレーンのつり上げ荷重はどれですか？",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toContain("小型移動式クレーン");
      expect(payload.answer).toContain("技能講習");
      expect(
        hasLegalSource(payload, /クレーン等安全規則|クレーン則/, /第68条/),
      ).toBe(true);
      expect(
        hasLegalSource(payload, /クレーン等安全規則|クレーン則/, /第22条/),
      ).toBe(false);
      expect(payload.answer).not.toMatch(/クレーン(?:等安全規則|則).*第22条/);
    },
  );

  it.each(executableRouteModes)(
    "P1-MULTITURN-SLINGING: 2トンの玉掛けは1トン以上の技能講習とし、クレーン則221条を示す ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "2トン", [
        { role: "user", content: "玉掛けの資格は？" },
        {
          role: "assistant",
          content: "クレーン等のつり上げ荷重はどれですか？",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toMatch(/1トン以上/);
      expect(payload.answer).toContain("技能講習");
      expect(
        hasLegalSource(payload, /クレーン等安全規則|クレーン則/, /第221条/),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "P1-MULTITURN-ASBESTOS: 建築物の事前調査者を石綿則3条4項へ結び付ける ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "建築物", [
        { role: "user", content: "石綿の事前調査は誰ができる？" },
        {
          role: "assistant",
          content: "石綿を確認する対象はどれですか？",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toContain("事前調査");
      expect(payload.answer).toMatch(/改修|建築物/);
      expect(
        hasLegalSource(payload, /石綿障害予防規則|石綿則/, /第3条.*第4項/),
      ).toBe(true);
      expectSupportedAsbestosParagraphSource(payload);
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.answer).not.toContain("次の質問");
      expect(payload.answer).not.toContain("設備の種類・高さ・荷重");
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-ASBESTOS: 2018年を追答後も保持し、現行の調査者要件を当時義務にしない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "建築物", [
        { role: "user", content: "2018年に石綿の事前調査ができる人は?" },
        {
          role: "assistant",
          content: "石綿を確認する対象はどれですか?",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.safetyKind).not.toBe("ambiguous");
      expect(payload.answer).toContain("当時の義務は確定できません");
      expect(payload.answer).toContain("2018・当時未施行");
      expect(payload.answer).not.toContain("行わせなければなりません");
      expect(
        payload.sources.some(
          (item) =>
            item.paragraph === "第4項" &&
            item.effectiveOn?.includes("令和5年10月1日") &&
            item.applicationStatus === "future",
        ),
      ).toBe(true);
      expectSupportedAsbestosParagraphSource(payload);
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-PARAGRAPH-NO-ITEM: 項だけの施行状況質問を号へ誤推測しない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(
        post,
        mode,
        "2022年の石綿則第3条第4項は施行済みですか？",
      );

      expect(response.status).toBe(200);
      expect(payload.answer).toContain("当時の義務は確定できません");
      expect(payload.answer).toContain("2022・当時未施行");
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.answer).not.toContain("次の質問");
      expect(payload.answer).not.toContain("設備の種類・高さ・荷重");
      expectSupportedAsbestosParagraphSource(payload);
    },
  );

  it.each(executableRouteModes)(
    "P1-CACHE-JST-DATE: 前日の回答payloadをJST日付境界後に再利用しない ($label)",
    async ({ post, mode }) => {
      vi.useFakeTimers();
      const message = "2022年の石綿則第3条第4項は施行済みですか？";
      const beforeMidnight = new Date("2026-08-02T14:59:59.999Z");
      const afterMidnight = new Date("2026-08-02T15:00:00.000Z");
      setCachedResponse(
        cacheKey(message, "all", beforeMidnight, VERIFIED_LEGAL_SOURCE_VERSION),
        {
          requiresHumanReview: true,
          answer: "STALE-PREVIOUS-DAY",
          sources: [
            {
              law: "石綿障害予防規則",
              article: "第3条第4項",
              paragraph: "第4項",
              item: "第4号",
              snippet: "第4号　誤った前日payload",
            },
          ],
          source_type: "rag",
          confidence: "low",
        },
      );
      vi.setSystemTime(afterMidnight);

      const { response, payload, raw } = await callRoute(post, mode, message);

      expect(response.status).toBe(200);
      expect(raw).not.toContain("STALE-PREVIOUS-DAY");
      expect(payload.answer).toContain("回答基準日: 2026-08-09 JST");
      expectSupportedAsbestosParagraphSource(payload);
      if (mode === "json") {
        expect(response.headers.get("X-Cache-Hit")).toBe("false");
      }
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-ASBESTOS-BOUNDARY: 2023年を10月1日の前後に分け、日付を一問だけ確認する ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(post, mode, "建築物", [
        { role: "user", content: "2023年に石綿の事前調査ができる人は?" },
        {
          role: "assistant",
          content: "石綿を確認する対象はどれですか?",
        },
      ]);

      expect(response.status).toBe(200);
      expect(payload.answer).toContain("2023-10-01から施行");
      expect(payload.answer).toContain("次の質問\n対象の日付を教えてください");
      expect(payload.answer).not.toContain("行わせなければなりません");
      expect(payload.answer).not.toContain("2023・当時未施行");
      expectSupportedAsbestosParagraphSource(payload);
    },
  );

  it.each(executableRouteModes)(
    "P1-TEMPORAL-EXACT-PARAGRAPH: 2022年の石綿則3条4項を条全体の施行日で施行済みにしない ($label)",
    async ({ post, mode }) => {
      const { response, payload } = await callRoute(
        post,
        mode,
        "2022年の石綿則第3条第4項の調査者資格は施行済みでしたか?",
      );

      expect(response.status).toBe(200);
      expect(payload.answer).toContain("当時の義務は確定できません");
      expect(payload.answer).toContain("2022・当時未施行");
      expect(payload.answer).not.toContain("指定時点で施行済み");
      expect(
        payload.sources.some(
          (item) =>
            item.paragraph === "第4項" &&
            item.effectiveOn?.includes("令和5年10月1日") &&
            item.applicationStatus === "future",
        ),
      ).toBe(true);
      expectSupportedAsbestosParagraphSource(payload);
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "PF-011-EXACT-SSE-PARITY: 生成停止中も指定条文をno-hitと誤表示しない (%s)",
    async (post, mode) => {
      const { response, payload } = await callRoute(
        post,
        mode,
        "労働安全衛生法第61条は何を定めていますか？",
      );
      expect(response.status).toBe(200);
      expect(payload.answer.startsWith("結論\n")).toBe(true);
      expect(payload.answer).toContain("安衛法第61条");
      expect(payload.answer).toMatch(/回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST/);
      expect(payload.answer).not.toContain("直接規定する条文は特定できません");
      expect(
        payload.sources.some((source) => source.article.includes("第61条")),
      ).toBe(true);
    },
  );

  it.each([postJson, postStream])(
    "rechecks every supplied history turn server-side",
    async (post) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const response = await post(
        new Request("http://localhost/api/chatbot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: "足場の点検方法は？",
            history: [
              { role: "user", content: "東京都新宿区西新宿2丁目8番1号" },
            ],
            privacyConfirmed: true,
          }),
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("個人情報");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([postJson, postStream])(
    "requires explicit anonymous-input confirmation",
    async (post) => {
      const response = await post(
        new Request("http://localhost/api/chatbot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "足場の点検方法は？" }),
        }),
      );
      expect(response.status).toBe(428);
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "誤前提・条件不足・未収録資料を %s 経路で外部AIへ送らず保留する",
    async (post, mode) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const cases = [
        {
          question:
            "常時50人以上の労働者を使用する事業場における安全管理者の選任義務は？",
          kind: "ambiguous",
          marker: "安衛則第7条とは区別",
        },
        {
          question: "休業補償給付（4日目以降の80％）の根拠条文は？",
          kind: "wrong-premise",
          marker: "休業特別支給金",
        },
        {
          question:
            "墜落制止用器具（要求性能墜落制止用器具）の点検・取替え基準の条文は？",
          kind: "wrong-premise",
          marker: "取替え時期",
        },
      ] as const;

      for (const testCase of cases) {
        const { response, payload } = await callRoute(
          post,
          mode,
          testCase.question,
        );
        expect(response.status).toBe(200);
        if (testCase.kind === "ambiguous") {
          expect(payload.safetyKind).toBeUndefined();
          expectAnswerFirst(payload);
          expect(payload.answer).not.toBe(payload.clarificationQuestion);
          expect(payload.sources.length).toBeGreaterThan(0);
        } else {
          expect(payload.safetyKind).toBe(testCase.kind);
          expect(payload.answer).toContain(testCase.marker);
          expect(payload.sources).toEqual([]);
        }
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    [postJson, "json"],
    [postStream, "sse"],
  ] as const)(
    "墜落防止の根拠案内を %s 経路でhash検証済みe-Gov本文だけに限定する",
    async (post, mode) => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-test-key");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const { response, payload } = await callRoute(
        post,
        mode,
        "足場から墜落しないための措置は何条ですか",
      );

      expect(response.status).toBe(200);
      expect(payload.sources.length).toBeGreaterThan(0);
      expect(
        payload.sources.some((item) =>
          /第(?:518|519|520|521)条/.test(item.article),
        ),
      ).toBe(true);
      for (const item of payload.sources) {
        expect(item.sourceKind).toBe("egov-fulltext-snapshot");
        expect(item.verificationStatus).toBe("snapshot-hash-verified");
        const fetchedAt = Date.parse(item.sourceFetchedAt ?? "");
        expect(Number.isFinite(fetchedAt)).toBe(true);
        expect(fetchedAt).toBeGreaterThanOrEqual(
          Date.parse("2026-07-23T00:00:00.000Z"),
        );
        expect(fetchedAt).toBeLessThanOrEqual(
          Date.parse("2026-08-09T00:00:00.000Z"),
        );
        expect(item.humanReviewStatus).toBe("not-reviewed");
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(executableRouteModes)(
    "1トン未満chipをフォークリフト特別教育へ結び付ける ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(post, mode, "1トン未満", [
        { role: "user", content: "フォークリフトに資格いる？" },
        {
          role: "assistant",
          content: "フォークリフトの最大荷重はどれですか？",
        },
      ]);
      expect(payload.answer).toContain("最大荷重1トン未満");
      expect(payload.answer).toContain("特別教育");
      expect(payload.answer).not.toContain("技能講習の修了者等に限られます");
      expect(hasLegalSource(payload, /労働安全衛生規則|安衛則/, /第36条/)).toBe(
        true,
      );
    },
  );

  it.each(executableRouteModes)(
    "1トン未満chipを玉掛け特別教育へ結び付ける ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(post, mode, "1トン未満", [
        { role: "user", content: "玉掛けに資格いる？" },
        {
          role: "assistant",
          content: "クレーン等のつり上げ荷重はどれですか？",
        },
      ]);
      expect(payload.answer).toContain("つり上げ荷重1トン未満");
      expect(payload.answer).toContain("特別教育");
      expect(payload.answer).not.toContain("技能講習の修了者等に限られます");
      expect(
        hasLegalSource(payload, /クレーン等安全規則|クレーン則/, /第222条/),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "移動式クレーンの閾値chip三択をそれぞれ正しい資格区分へ結ぶ ($label)",
    async ({ post, mode }) => {
      const history = [
        { role: "user" as const, content: "移動式クレーンの資格は？" },
        {
          role: "assistant" as const,
          content: "移動式クレーンのつり上げ荷重はどれですか？",
        },
      ];
      const below = await callRoute(post, mode, "1トン未満", history);
      const middle = await callRoute(post, mode, "1〜5トン未満", history);
      const high = await callRoute(post, mode, "5トン以上", history);
      expect(below.payload.answer).toContain("1トン未満");
      expect(below.payload.answer).toContain("特別教育");
      expect(middle.payload.answer).toContain("1トン以上5トン未満");
      expect(middle.payload.answer).toContain("技能講習");
      expect(high.payload.answer).toContain("5トン以上");
      expect(high.payload.answer).toContain("運転士免許");
    },
  );

  it.each(executableRouteModes)(
    "荷重不明chipは同じ確認を繰り返さず銘板確認で保留する ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(post, mode, "分からない", [
        { role: "user", content: "フォークリフトに資格いる？" },
        {
          role: "assistant",
          content: "フォークリフトの最大荷重はどれですか？",
        },
      ]);
      expect(payload.answer).toMatch(/最大荷重1トン未満.*特別教育/);
      expect(payload.answer).toMatch(/最大荷重1トン以上.*技能講習/);
      expect(payload.answer).toMatch(/車体銘板|仕様書/);
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toMatch(/(?:車体銘板|仕様書).*最大荷重/);
      expect(payload.quickReplies).toEqual([]);
      expect(payload.source_type).toBe("rag");
      expect(payload.sources.length).toBeGreaterThan(0);
      expect(payload.citations?.length ?? 0).toBeGreaterThan(0);
      expect(payload.effectiveDateStatus).toMatchObject({
        status: "current",
        asOf: "2026-08-09",
      });
    },
  );

  it.each(executableRouteModes)(
    "フォークリトの誤字を最大荷重付き資格質問として扱う ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "フォークリトの最大荷重1.5トン、運転資格は？",
      );
      expect(payload.answer).toContain("最大荷重1トン以上");
      expect(payload.answer).toContain("技能講習");
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
    },
  );

  it.each(executableRouteModes)(
    "フォークの略称を最大荷重付き資格質問として扱う ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "フォークの最大荷重1.5トンを運転する資格は？",
      );
      expect(payload.answer).toContain("最大荷重1トン以上");
      expect(payload.answer).toContain("技能講習");
      expect(payload.clarification).toBeUndefined();
    },
  );

  it.each(executableRouteModes)(
    "脚立を明示した高さ質問は設備を聞き直さず、足元の高さだけを確認する ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "脚立で作業していい高さは？",
      );
      expect(payload.clarification).toEqual({
        question: "作業時の足元の高さはどれですか？",
        options: ["2m未満", "2m以上", "分からない"],
      });
      expectAnswerFirst(payload);
      expect(payload.answer).not.toBe("作業時の足元の高さはどれですか？");
      expect(payload.answer).not.toMatch(/(?:使う|どの)設備/);
    },
  );

  it.each(executableRouteModes)(
    "脚立の高さ回答後と、はしご・作業台には次の条件を一つだけ返す ($label)",
    async ({ post, mode }) => {
      const ladderHistory = [
        { role: "user" as const, content: "脚立で作業していい高さは？" },
        {
          role: "assistant" as const,
          content: "作業時の足元の高さはどれですか？",
        },
      ];
      const ladder = await callRoute(post, mode, "2m以上", ladderHistory);
      expect(ladder.payload.clarification).toEqual({
        question: "脚立をどの使い方で確認しますか？",
        options: ["天板に立つ", "段に立つ", "昇降だけ"],
      });
      expectAnswerFirst(ladder.payload);
      expect(ladder.payload.answer).not.toBe(
        "脚立をどの使い方で確認しますか？",
      );

      for (const [query, question, options] of [
        [
          "はしご作業 はしご 高さ はしご",
          "はしごを何に使いますか？",
          ["昇降用", "作業場所", "条件不明"],
        ],
        [
          "作業台",
          "作業台の種類はどれですか？",
          ["可搬式作業台", "ローリングタワー", "種類不明"],
        ],
      ] as const) {
        const { payload } = await callRoute(post, mode, query);
        expect(payload.clarification).toEqual({
          question,
          options: [...options],
        });
        expectAnswerFirst(payload);
        expect(payload.answer).not.toBe(question);
      }
    },
  );

  it.each(executableRouteModes)(
    "563条1項3号の手すり数値は552条1項4号を対応引用する ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "労働安全衛生規則第563条第1項第3号の手すり高さは？",
      );
      expect(payload.answer).toContain("高さ85cm以上");
      expect(payload.answer).toContain("高さ35〜50cm");
      const scaffold = payload.sources.find((item) =>
        /第563条/.test(item.article),
      );
      const definition = payload.sources.find((item) =>
        /第552条/.test(item.article),
      );
      expect(scaffold?.item).toBe("第3号");
      expect(`${scaffold?.text ?? ""}${scaffold?.snippet ?? ""}`).toContain(
        "手すり等及び中桟等",
      );
      expect(definition?.item).toBe("第4号");
      expect(`${definition?.text ?? ""}${definition?.snippet ?? ""}`).toMatch(
        /八十五センチメートル以上/,
      );
      expect(`${definition?.text ?? ""}${definition?.snippet ?? ""}`).toMatch(
        /三十五センチメートル以上五十センチメートル以下/,
      );

      const natural = await callRoute(post, mode, "足場の手すりは何センチ？");
      const naturalScaffold = natural.payload.sources.find((item) =>
        /第563条/.test(item.article),
      );
      const naturalDefinition = natural.payload.sources.find((item) =>
        /第552条/.test(item.article),
      );
      expect(naturalScaffold?.item).toBe("第3号");
      expect(naturalDefinition?.item).toBe("第4号");
      expect(
        `${naturalDefinition?.text ?? ""}${naturalDefinition?.snippet ?? ""}`,
      ).toContain("八十五センチメートル以上");
    },
  );

  it.each(executableRouteModes)(
    "屋内の第2種有機溶剤は例外条文でなく有機則5条を答える ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(post, mode, "第2種", [
        { role: "user", content: "有機溶剤を屋内で使う時は？" },
        {
          role: "assistant",
          content: "使う有機溶剤の区分はどれですか？",
        },
      ]);
      expectAnswerFirst(payload);
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.answer).toMatch(/(?:密閉設備|密閉する設備)/);
      expect(payload.answer).toContain("局所排気装置");
      expect(payload.answer).toContain("プッシュプル型換気装置");
      expect(payload.answer).not.toContain("臨時作業");
      expect(payload.answer).not.toMatch(/第三種|タンク.*内部|全体換気/);
      expect(
        hasLegalSource(payload, /有機溶剤中毒予防規則|有機則/, /第5条/),
      ).toBe(true);
      expect(
        payload.sources.some((source) => /第8条/.test(source.article)),
      ).toBe(false);
      const organicEquipmentSource = payload.sources.find((source) =>
        /第5条/.test(source.article),
      );
      expect(organicEquipmentSource?.item).toBeUndefined();
      expect(`${organicEquipmentSource?.text ?? ""}`).toContain("局所排気装置");
    },
  );

  it.each(executableRouteModes)(
    "明示項号は同じunitから回答し、誤前提は採用したsemantic unitへ訂正する ($label)",
    async ({ post, mode }) => {
      const specialEducation = await callRoute(
        post,
        mode,
        "安衛法第59条第3項とは？",
      );
      expectAnswerFirst(specialEducation.payload);
      expect(specialEducation.payload.substantiveAnswer).toContain(
        "特別の教育",
      );
      expect(specialEducation.payload.substantiveAnswer).not.toContain(
        "雇い入れ",
      );
      expect(specialEducation.payload.sources[0]?.paragraph).toBe("第3項");

      const organicParagraph = await callRoute(
        post,
        mode,
        "有機則第9条第2項とは？",
      );
      expectAnswerFirst(organicParagraph.payload);
      expect(organicParagraph.payload.substantiveAnswer).toContain(
        "送気マスク",
      );
      expect(organicParagraph.payload.substantiveAnswer).not.toContain(
        "内部以外",
      );
      expect(organicParagraph.payload.sources[0]?.paragraph).toBe("第2項");

      const healthItem = await callRoute(
        post,
        mode,
        "有機則第29条第5項第2号とは？",
      );
      expectAnswerFirst(healthItem.payload);
      expect(healthItem.payload.substantiveAnswer).toContain("貧血検査");
      expect(healthItem.payload.substantiveAnswer).not.toContain(
        "作業条件の簡易な調査",
      );
      expect(healthItem.payload.sources[0]).toMatchObject({
        paragraph: "第5項",
        item: "第2号",
      });

      const correctedPlatform = await callRoute(
        post,
        mode,
        "高所作業車について安衛令第10条第1号、作業床最高高さ2m未満なら？",
      );
      expectAnswerFirst(correctedPlatform.payload);
      expect(correctedPlatform.payload.substantiveAnswer).toContain("2m未満");
      expect(
        correctedPlatform.payload.sources.find(
          ({ law, article }) =>
            law === "労働安全衛生法施行令" && /第10条/.test(article),
        )?.item,
      ).toBe("第7号");

      const correctedOrganic = await callRoute(
        post,
        mode,
        "有機溶剤を屋内で第2種、短時間、タンク内部。第9条第1項で送気マスクを備えれば？",
      );
      expectAnswerFirst(correctedOrganic.payload);
      expect(correctedOrganic.payload.substantiveAnswer).toContain("第9条2項");
      expect(
        correctedOrganic.payload.sources.find(({ article }) =>
          /第9条/.test(article),
        )?.paragraph,
      ).toBe("第2項");

      const correctedHealth = await callRoute(
        post,
        mode,
        "有機溶剤について、有機則第29条第1項の健康診断義務は？",
      );
      expectAnswerFirst(correctedHealth.payload);
      expect(correctedHealth.payload.substantiveAnswer).toContain("29条2項");
      expect(
        correctedHealth.payload.sources.find(({ article }) =>
          /第29条/.test(article),
        )?.paragraph,
      ).toBe("第2項");

      const healthScope = await callRoute(
        post,
        mode,
        "有機溶剤の健康診断について、有機則第29条第1項の対象業務は？",
      );
      expectAnswerFirst(healthScope.payload);
      expect(healthScope.payload.substantiveAnswer).toContain("29条1項");
      expect(healthScope.payload.substantiveAnswer).toContain("対象業務");
      expect(healthScope.payload.substantiveAnswer).not.toContain("6か月以内");
      expect(
        healthScope.payload.sources.find(({ article }) =>
          /第29条/.test(article),
        )?.paragraph,
      ).toBe("第1項");
    },
  );

  it.each(executableRouteModes)(
    "電気資格の広い質問と低圧充電電路の具体質問を条項号へ対応付ける ($label)",
    async ({ post, mode }) => {
      const broad = await callRoute(post, mode, "電気作業の資格は？");
      expectAnswerFirst(broad.payload);
      const definition = broad.payload.sources.find(
        ({ law, article }) => law === "電気工事士法" && /第2条/.test(article),
      );
      const restriction = broad.payload.sources.find(
        ({ law, article }) => law === "電気工事士法" && /第3条/.test(article),
      );
      const educationDuty = broad.payload.sources.find(
        ({ law, article }) =>
          law === "労働安全衛生法" && /第59条/.test(article),
      );
      const educationWork = broad.payload.sources.find(
        ({ law, article }) =>
          law === "労働安全衛生規則" && /第36条/.test(article),
      );
      expect(definition?.paragraph).toBe("第3項");
      expect(definition?.snippet).toMatch(/電気工事.*設置し、又は変更/);
      expect(restriction?.paragraph).toBe("第1項・第2項・第3項・第4項");
      expect(restriction?.snippet).toMatch(
        /第1項[\s\S]*第一種電気工事士免状[\s\S]*第2項[\s\S]*第二種電気工事士免状[\s\S]*第3項[\s\S]*特種電気工事資格者認定証[\s\S]*第4項[\s\S]*認定電気工事従事者認定証/,
      );
      expect(educationDuty?.paragraph).toBe("第3項");
      expect(educationDuty?.snippet).toMatch(/危険又は有害な業務.*特別の教育/);
      expect(educationWork?.item).toBe("第4号");
      expect(educationWork?.snippet).toMatch(
        /低圧[\s\S]*交流にあつては六百ボルト以下[\s\S]*対地電圧が五十ボルト以下[\s\S]*敷設若しくは修理/,
      );

      const specific = await callRoute(
        post,
        mode,
        "低圧の充電電路の敷設作業に特別教育は必要？",
      );
      expectAnswerFirst(specific.payload);
      expect(specific.payload.substantiveAnswer).toMatch(
        /対地電圧50V以下.*除(?:き|く).*特別教育が必要/,
      );
      expect(specific.payload.substantiveAnswer).toContain("特別教育が必要");
      expect(specific.payload.clarificationQuestion).toBeNull();
      const specificDefinition = specific.payload.sources.find(
        ({ law, article }) => law === "電気工事士法" && /第2条/.test(article),
      );
      const specificRestriction = specific.payload.sources.find(
        ({ law, article }) => law === "電気工事士法" && /第3条/.test(article),
      );
      const specificDuty = specific.payload.sources.find(
        ({ law, article }) =>
          law === "労働安全衛生法" && /第59条/.test(article),
      );
      const specificWork = specific.payload.sources.find(
        ({ law, article }) =>
          law === "労働安全衛生規則" && /第36条/.test(article),
      );
      expect(specificDefinition?.paragraph).toBe("第3項");
      expect(specificRestriction?.snippet).toContain(
        "認定電気工事従事者認定証",
      );
      expect(specificDuty?.paragraph).toBe("第3項");
      expect(specificWork?.item).toBe("第4号");

      for (const wrongPremise of [
        "低圧の充電電路の敷設・修理に特別教育は必要？安衛則第36条第5号との関係は？",
        "低圧の充電電路の敷設・修理に特別教育は必要？安衛法第59条第1項との関係は？",
      ]) {
        const corrected = await callRoute(post, mode, wrongPremise);
        expectAnswerFirst(corrected.payload);
        expect(corrected.payload.substantiveAnswer).toMatch(
          /対地電圧50V以下.*除(?:き|く).*特別教育が必要/,
        );
        expect(corrected.payload.substantiveAnswer).toContain("特別教育が必要");
        expect(
          corrected.payload.sources.find(
            ({ law, article }) =>
              law === "労働安全衛生法" && /第59条/.test(article),
          )?.paragraph,
        ).toBe("第3項");
        expect(
          corrected.payload.sources.find(
            ({ law, article }) =>
              law === "労働安全衛生規則" && /第36条/.test(article),
          )?.item,
        ).toBe("第4号");
      }
    },
  );

  it.each(executableRouteModes)(
    "純粋な別号照会は電気・足場のsemantic excerptで上書きしない ($label)",
    async ({ post, mode }) => {
      const electric = await callRoute(
        post,
        mode,
        "安衛則第36条第5号の電気工事とは？",
      );
      expectAnswerFirst(electric.payload);
      expect(electric.payload.sources[0]?.item).toBe("第5号");
      expect(electric.payload.sources[0]?.snippet).not.toContain(
        "低圧の充電電路",
      );

      const scaffold = await callRoute(
        post,
        mode,
        "安衛則第563条第1項第4号の支持物要件は？",
      );
      expectAnswerFirst(scaffold.payload);
      expect(scaffold.payload.sources[0]).toMatchObject({
        paragraph: "第1項",
        item: "第4号",
      });
      expect(scaffold.payload.sources[0]?.snippet).not.toContain("中桟");

      const access = await callRoute(
        post,
        mode,
        "安衛則第552条第1項第1号とは？",
      );
      expectAnswerFirst(access.payload);
      expect(access.payload.sources[0]).toMatchObject({
        paragraph: "第1項",
        item: "第1号",
      });
      expect(access.payload.sources[0]?.snippet).not.toContain("八十五センチ");
    },
  );

  it.each(executableRouteModes)(
    "存在しない項号を実在metadataや別本文として返さない ($label)",
    async ({ post, mode }) => {
      for (const query of [
        "安衛則第563条第99項とは？",
        "安衛則第563条第1項第99号とは？",
      ]) {
        const result = await callRoute(post, mode, query);
        expectAnswerFirst(result.payload);
        expect(result.payload.substantiveAnswer).toContain("確認できません");
        expect(result.payload.substantiveAnswer).toContain("推測せず");
        expect(result.payload.sources[0]?.paragraph).not.toBe("第99項");
        expect(result.payload.sources[0]?.item).not.toBe("第99号");
      }
    },
  );

  it.each(executableRouteModes)(
    "石綿の調査者質問は誤指定unitを4項へ補正し、鋼製船舶の範囲を示す ($label)",
    async ({ post, mode }) => {
      for (const query of [
        "石綿則第3条第1項の調査者は誰？",
        "石綿則第3条第4号の調査者は誰？",
      ]) {
        const corrected = await callRoute(post, mode, query);
        expectAnswerFirst(corrected.payload);
        expect(corrected.payload.substantiveAnswer).toMatch(
          /建築物石綿含有建材調査者|船舶石綿含有資材調査者/,
        );
        expect(corrected.payload.sources[0]?.paragraph).toBe("第4項");
        expect(corrected.payload.sources[0]?.item).toBeUndefined();
        expect(corrected.payload.sources[0]?.snippet).toMatch(/第1項.*第4項/);
      }

      const vessel = await callRoute(post, mode, "船舶の石綿事前調査者は誰？");
      expectAnswerFirst(vessel.payload);
      expect(vessel.payload.substantiveAnswer).toContain(
        "鋼製の船舶に限られます",
      );
      expect(vessel.payload.sources[0]?.snippet).toContain("鋼製の船舶に限る");
    },
  );

  it.each(executableRouteModes)(
    "有機溶剤健診の実施義務を29条2項へ対応付ける ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(
        post,
        mode,
        "有機溶剤の健康診断はいつ必要？",
      );
      expectAnswerFirst(payload);
      expect(payload.answer).toContain("29条2項");
      expect(payload.answer).not.toContain("29条1項の対象となる");
      const source = payload.sources.find(({ article }) =>
        /第29条/.test(article),
      );
      expect(source?.paragraph).toBe("第2項");
      expect(source?.snippet).toMatch(
        /常時従事する労働者.*雇入れの際.*配置替え.*六月以内ごとに一回.*健康診断/,
      );
    },
  );

  it.each(executableRouteModes)(
    "有機溶剤の区分・例外・場所を実assistant履歴から継続する ($label)",
    async ({ post, mode }) => {
      const initialMessage = "有機溶剤を屋内で使う時は？";
      const initial = await callRoute(post, mode, initialMessage);
      expectAnswerFirst(initial.payload);
      expect(initial.payload.clarificationQuestion).toContain("SDS上の区分");
      expect(initial.payload.quickReplies.map(({ label }) => label)).toEqual([
        "第1種",
        "第2種",
        "第3種",
      ]);
      const baseHistory = [
        { role: "user" as const, content: initialMessage },
        { role: "assistant" as const, content: initial.payload.answer },
      ];

      for (const solventClass of ["第1種", "第2種"] as const) {
        const result = await callRoute(post, mode, solventClass, baseHistory);
        expectAnswerFirst(result.payload);
        expect(result.payload.answer).toMatch(/(?:密閉設備|密閉する設備)/);
        expect(result.payload.answer).not.toMatch(/第三種|臨時作業|短時間作業/);
        expect(
          hasLegalSource(
            result.payload,
            /有機溶剤中毒予防規則|有機則/,
            /第5条/,
          ),
        ).toBe(true);
        expect(
          result.payload.sources.some(({ article }) =>
            /第6条|第8条|第9条/.test(article),
          ),
        ).toBe(false);
      }

      const third = await callRoute(post, mode, "第3種", baseHistory);
      expectAnswerFirst(third.payload);
      expect(third.payload.answer).toContain("タンク等の内部");
      expect(third.payload.answer).toContain("全体換気装置");
      expect(third.payload.answer).not.toContain("第一種・第二種");
      expect(third.payload.clarificationQuestion).toContain("タンク等の内部");
      expect(third.payload.quickReplies.map(({ label }) => label)).toEqual([
        "タンク等の内部",
        "それ以外の屋内",
        "不明",
      ]);
      expect(
        hasLegalSource(third.payload, /有機溶剤中毒予防規則|有機則/, /第6条/),
      ).toBe(true);
      expect(
        third.payload.sources.some(({ article }) => /第5条/.test(article)),
      ).toBe(false);
      const broadThirdSource = third.payload.sources.find(({ article }) =>
        /第6条/.test(article),
      );
      expect(broadThirdSource?.paragraph).toBeUndefined();
      expect(broadThirdSource?.snippet).toMatch(
        /全体換気装置.*吹付けによる第三種.*密閉する設備/,
      );

      const thirdOutside = await callRoute(post, mode, "それ以外の屋内", [
        ...baseHistory,
        { role: "user", content: "第3種" },
        { role: "assistant", content: third.payload.answer },
      ]);
      expectAnswerFirst(thirdOutside.payload);
      expect(thirdOutside.payload.answer).toContain("タンク等の内部以外");
      expect(thirdOutside.payload.answer).toContain(
        "同条の設備義務は適用されません",
      );
      expect(thirdOutside.payload.answer).not.toContain("第一種・第二種");
      expect(thirdOutside.payload.clarificationQuestion).toBeNull();
      expect(
        hasLegalSource(
          thirdOutside.payload,
          /有機溶剤中毒予防規則|有機則/,
          /第6条/,
        ),
      ).toBe(true);

      const unknownLocation = await callRoute(post, mode, "不明", [
        ...baseHistory,
        { role: "user", content: "第3種" },
        { role: "assistant", content: third.payload.answer },
      ]);
      expectAnswerFirst(unknownLocation.payload);
      expect(unknownLocation.payload.answer).toContain("容器・設備図面");
      expect(unknownLocation.payload.answer).toMatch(
        /第三種.*タンク等の内部.*(?:密閉|局所排気|プッシュプル|全体換気).*タンク等の内部以外/,
      );
      expect(unknownLocation.payload.clarificationQuestion).toMatch(
        /タンク等の内部.*それ以外の屋内/,
      );
      expect(unknownLocation.payload.quickReplies).toEqual([]);
      expect(
        hasLegalSource(
          unknownLocation.payload,
          /有機溶剤中毒予防規則|有機則/,
          /第6条/,
        ),
      ).toBe(true);

      const temporary = await callRoute(
        post,
        mode,
        "第2種を臨時作業で使う",
        baseHistory,
      );
      expectAnswerFirst(temporary.payload);
      expect(temporary.payload.answer).toContain("臨時");
      expect(temporary.payload.answer).toContain("タンク等の内部以外");
      expect(temporary.payload.answer).toContain("全体換気装置");
      expect(
        hasLegalSource(
          temporary.payload,
          /有機溶剤中毒予防規則|有機則/,
          /第8条/,
        ),
      ).toBe(true);
      expect(
        temporary.payload.sources.some(({ article }) => /第9条/.test(article)),
      ).toBe(false);
      const broadTemporarySource = temporary.payload.sources.find(
        ({ article }) => /第8条/.test(article),
      );
      expect(broadTemporarySource?.paragraph).toBe("第1項・第2項");
      expect(broadTemporarySource?.snippet).toMatch(
        /第1項[\s\S]*適用しない[\s\S]*第2項[\s\S]*全体換気装置[\s\S]*設けないことができる/,
      );

      for (const location of ["タンク等の内部", "それ以外の屋内"] as const) {
        const locatedTemporary = await callRoute(post, mode, location, [
          ...baseHistory,
          { role: "user", content: "第2種を臨時作業で使う" },
          { role: "assistant", content: temporary.payload.answer },
        ]);
        expectAnswerFirst(locatedTemporary.payload);
        expect(locatedTemporary.payload.answer).toContain("臨時作業");
        expect(locatedTemporary.payload.answer).toContain("第8条");
        expect(locatedTemporary.payload.answer).not.toContain(
          "原則として発散源",
        );
        expect(locatedTemporary.payload.clarificationQuestion).toBeNull();
        const exceptionSource = locatedTemporary.payload.sources.find(
          ({ article }) => /第8条/.test(article),
        );
        expect(exceptionSource?.paragraph).toBe(
          location === "タンク等の内部" ? "第2項" : "第1項",
        );
        if (location === "タンク等の内部") {
          expect(locatedTemporary.payload.answer).toContain("第8条2項");
          expect(locatedTemporary.payload.answer).toContain("全体換気装置");
          expect(exceptionSource?.snippet).toMatch(
            /タンク等の内部.*全体換気装置/,
          );
          expect(exceptionSource?.snippet).not.toContain("内部以外");
        } else {
          expect(locatedTemporary.payload.answer).toContain("第8条1項");
          expect(locatedTemporary.payload.answer).toContain("適用されません");
          expect(exceptionSource?.snippet).toMatch(
            /タンク等の内部以外.*適用しない/,
          );
        }
      }

      const shortTime = await callRoute(
        post,
        mode,
        "第2種を短時間作業で使う",
        baseHistory,
      );
      expectAnswerFirst(shortTime.payload);
      expect(shortTime.payload.answer).toContain("短時間");
      expect(shortTime.payload.answer).toContain("全体換気装置");
      expect(shortTime.payload.answer).toContain("送気マスク");
      expect(
        hasLegalSource(
          shortTime.payload,
          /有機溶剤中毒予防規則|有機則/,
          /第9条/,
        ),
      ).toBe(true);
      expect(
        shortTime.payload.sources.some(({ article }) => /第8条/.test(article)),
      ).toBe(false);
      const broadShortTimeSource = shortTime.payload.sources.find(
        ({ article }) => /第9条/.test(article),
      );
      expect(broadShortTimeSource?.paragraph).toBe("第1項・第2項");
      expect(broadShortTimeSource?.snippet).toMatch(
        /第1項[\s\S]*全体換気装置[\s\S]*設けないことができる[\s\S]*第2項[\s\S]*送気マスク[\s\S]*設けないことができる/,
      );

      for (const location of ["タンク等の内部", "それ以外の屋内"] as const) {
        const locatedShortTime = await callRoute(post, mode, location, [
          ...baseHistory,
          { role: "user", content: "第2種を短時間作業で使う" },
          { role: "assistant", content: shortTime.payload.answer },
        ]);
        expectAnswerFirst(locatedShortTime.payload);
        expect(locatedShortTime.payload.answer).toContain("短時間作業");
        expect(locatedShortTime.payload.answer).toContain("第9条");
        expect(locatedShortTime.payload.answer).not.toContain(
          "原則として発散源",
        );
        expect(locatedShortTime.payload.clarificationQuestion).toBeNull();
        const exceptionSource = locatedShortTime.payload.sources.find(
          ({ article }) => /第9条/.test(article),
        );
        expect(exceptionSource?.paragraph).toBe(
          location === "タンク等の内部" ? "第2項" : "第1項",
        );
        if (location === "タンク等の内部") {
          expect(locatedShortTime.payload.answer).toContain("第9条2項");
          expect(locatedShortTime.payload.answer).toContain("送気マスク");
          expect(exceptionSource?.snippet).toMatch(
            /タンク等の内部.*送気マスク/,
          );
          expect(exceptionSource?.snippet).not.toContain("内部以外");
        } else {
          expect(locatedShortTime.payload.answer).toContain("第9条1項");
          expect(locatedShortTime.payload.answer).toContain("全体換気装置");
          expect(exceptionSource?.snippet).toMatch(
            /タンク等の内部以外.*全体換気装置/,
          );
        }
      }

      const thirdTemporary = await callRoute(post, mode, "臨時作業", [
        ...baseHistory,
        { role: "user", content: "第3種" },
        { role: "assistant", content: third.payload.answer },
      ]);
      expectAnswerFirst(thirdTemporary.payload);
      expect(thirdTemporary.payload.clarificationQuestion).toContain(
        "タンク等の内部",
      );

      const thirdTemporaryInside = await callRoute(
        post,
        mode,
        "タンク等の内部",
        [
          ...baseHistory,
          { role: "user", content: "第3種" },
          { role: "assistant", content: third.payload.answer },
          { role: "user", content: "臨時作業" },
          { role: "assistant", content: thirdTemporary.payload.answer },
        ],
      );
      expectAnswerFirst(thirdTemporaryInside.payload);
      expect(thirdTemporaryInside.payload.answer).toContain("第6条1項");
      expect(thirdTemporaryInside.payload.answer).toContain("第6条2項");
      expect(thirdTemporaryInside.payload.answer).toContain("第8条2項");
      expect(thirdTemporaryInside.payload.clarificationQuestion).toContain(
        "吹付け作業ですか",
      );
      expect(
        thirdTemporaryInside.payload.quickReplies.map(({ label }) => label),
      ).toEqual(["吹付け作業", "吹付け以外", "不明"]);
      const insideException = thirdTemporaryInside.payload.sources.find(
        ({ article }) => /第8条/.test(article),
      );
      expect(insideException?.paragraph).toBe("第2項");
      expect(insideException?.snippet).toMatch(/タンク等の内部.*全体換気装置/);
      const unresolvedMethodSource = thirdTemporaryInside.payload.sources.find(
        ({ article }) => /第6条/.test(article),
      );
      expect(unresolvedMethodSource?.paragraph).toBeUndefined();
      expect(unresolvedMethodSource?.snippet).toMatch(
        /全体換気装置.*吹付けによる第三種/,
      );

      for (const method of ["吹付け作業", "吹付け以外"] as const) {
        const methodResult = await callRoute(post, mode, method, [
          ...baseHistory,
          { role: "user", content: "第3種" },
          { role: "assistant", content: third.payload.answer },
          { role: "user", content: "臨時作業" },
          { role: "assistant", content: thirdTemporary.payload.answer },
          { role: "user", content: "タンク等の内部" },
          { role: "assistant", content: thirdTemporaryInside.payload.answer },
        ]);
        expectAnswerFirst(methodResult.payload);
        expect(methodResult.payload.clarificationQuestion).toBeNull();
        const equipmentSource = methodResult.payload.sources.find(
          ({ article }) => /第6条/.test(article),
        );
        const exceptionSource = methodResult.payload.sources.find(
          ({ article }) => /第8条/.test(article),
        );
        expect(equipmentSource?.paragraph).toBe(
          method === "吹付け作業" ? "第2項" : "第1項",
        );
        expect(exceptionSource?.paragraph).toBe("第2項");
        if (method === "吹付け作業") {
          expect(methodResult.payload.answer).toContain("第6条2項");
          expect(methodResult.payload.answer).toContain(
            "設けないことができます",
          );
          expect(equipmentSource?.snippet).toMatch(/吹付け.*局所排気装置/);
        } else {
          expect(methodResult.payload.answer).toContain("第6条1項");
          expect(methodResult.payload.answer).toContain("省略できません");
          expect(equipmentSource?.snippet).toMatch(
            /吹付けによる.*除く.*全体換気装置/,
          );
        }
      }
    },
  );

  it.each(executableRouteModes)(
    "酸欠監視人の場所回答後は再質問せず酸欠則13条を答える ($label)",
    async ({ post, mode }) => {
      const { payload } = await callRoute(post, mode, "タンク・ピット内", [
        { role: "user", content: "酸欠作業の監視人は必要？" },
        {
          role: "assistant",
          content: "酸欠のおそれがあるのは、どの作業場所ですか？",
        },
      ]);
      expect(payload.clarification).toBeUndefined();
      expect(payload.answer).toContain("常時監視");
      expect(payload.answer).toContain("直ちに通報する者");
      expect(
        hasLegalSource(payload, /酸素欠乏症等防止規則|酸欠則/, /第13条/),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "法定教育・作業床・酸欠・熱中症の結論を対応する項号と全文抜粋で支える ($label)",
    async ({ post, mode }) => {
      const forklift = await callRoute(
        post,
        mode,
        "最大荷重0.8トンのフォークリフトに必要な教育は？",
      );
      expectAnswerFirst(forklift.payload);
      expect(forklift.payload.substantiveAnswer).toContain("特別教育");
      expect(
        forklift.payload.sources.find(
          ({ law, article }) =>
            /労働安全衛生法$/.test(law) && /第59条/.test(article),
        )?.paragraph,
      ).toBe("第3項");
      expect(
        forklift.payload.sources.find(
          ({ law, article }) =>
            /労働安全衛生規則/.test(law) && /第36条/.test(article),
        )?.item,
      ).toBe("第5号");

      const floor = await callRoute(
        post,
        mode,
        "足場の作業床の幅と隙間の基準は？",
      );
      expectAnswerFirst(floor.payload);
      expect(floor.payload.substantiveAnswer).toContain("幅40cm以上");
      expect(floor.payload.conditions.join(" ")).toContain("3cm以下");
      expect(floor.payload.conditions.join(" ")).toContain("24cm未満");
      const floorSource = floor.payload.sources.find(({ article }) =>
        /第563条/.test(article),
      );
      expect(floorSource?.paragraph).toBe("第1項");
      expect(floorSource?.item).toBe("第2号");
      expect(floorSource?.snippet).toMatch(/第1項第2号.*第2項.*24cm未満/);

      const measurement = await callRoute(
        post,
        mode,
        "酸素欠乏危険作業で作業前の酸素濃度測定は必要？",
      );
      expectAnswerFirst(measurement.payload);
      expect(measurement.payload.substantiveAnswer).toMatch(/作業開始前.*測定/);
      const measurementSource = measurement.payload.sources.find(
        ({ article }) => /第3条/.test(article),
      );
      expect(measurementSource?.paragraph).toBe("第1項・第2項");
      expect(measurementSource?.snippet).toMatch(
        /第1項[\s\S]*第2項[\s\S]*(?:三|3)年間保存/,
      );

      const record = await callRoute(
        post,
        mode,
        "酸素欠乏危険作業の測定記録は何年保存？",
      );
      expectAnswerFirst(record.payload);
      expect(record.payload.substantiveAnswer).toContain("3年間");
      expect(
        record.payload.sources.find(({ article }) => /第3条/.test(article))
          ?.paragraph,
      ).toBe("第2項");

      const concentration = await callRoute(post, mode, "酸素濃度は何%以上？");
      expectAnswerFirst(concentration.payload);
      expect(concentration.payload.substantiveAnswer).toContain("18%以上");
      const ventilationSource = concentration.payload.sources.find(
        ({ article }) => /第5条/.test(article),
      );
      expect(ventilationSource?.snippet).toMatch(
        /十八パーセント以上[\s\S]*換気[\s\S]*著しく困難/,
      );

      const education = await callRoute(
        post,
        mode,
        "酸素欠乏危険作業に特別教育は必要？",
      );
      expectAnswerFirst(education.payload);
      expect(education.payload.substantiveAnswer).toMatch(/^はい。/);
      const educationSource = education.payload.sources.find(({ article }) =>
        /第12条/.test(article),
      );
      expect(educationSource?.paragraph).toBe("第1項・第2項");
      expect(educationSource?.snippet).toMatch(
        /第1項[\s\S]*第2項[\s\S]*第二種/,
      );

      const heat = await callRoute(
        post,
        mode,
        "熱中症対応の手順と体制の義務は？",
      );
      expectAnswerFirst(heat.payload);
      expect(heat.payload.substantiveAnswer).toMatch(
        /報告.*体制.*離脱.*冷却.*手順/,
      );
      expect(
        heat.payload.sources.find(({ article }) => /第612条の2/.test(article))
          ?.snippet,
      ).toMatch(/対象.*第1項.*第2項.*医師/);
    },
  );

  it.each(executableRouteModes)(
    "酸欠則の項号・濃度・教育・主任者・換気例外を一次本文で答える ($label)",
    async ({ post, mode }) => {
      const explicitSecond = await callRoute(
        post,
        mode,
        "酸欠則12条2項の特別教育の読み替えは？",
      );
      expectAnswerFirst(explicitSecond.payload);
      expect(explicitSecond.payload.substantiveAnswer).toMatch(
        /1項は第一種.*2項.*第二種.*第1号.*第2号・第5号/,
      );
      const explicitSecondSource = explicitSecond.payload.sources.find(
        ({ article }) => /第12条/.test(article),
      );
      expect(explicitSecondSource?.paragraph).toBe("第2項");
      expect(explicitSecondSource?.snippet).toMatch(
        /前項の規定[\s\S]*第二種酸素欠乏危険作業[\s\S]*第一号[\s\S]*酸素欠乏等[\s\S]*第二号及び第五号[\s\S]*酸素欠乏症等/,
      );

      const secondEducationH2s = await callRoute(
        post,
        mode,
        "第二種酸素欠乏危険作業の特別教育では硫化水素の科目も必要？",
      );
      expectAnswerFirst(secondEducationH2s.payload);
      expect(secondEducationH2s.payload.substantiveAnswer).toMatch(
        /^はい。.*第1号・第2号・第5号.*硫化水素/,
      );
      expect(secondEducationH2s.payload.conditions.join(" ")).toMatch(
        /12条2項.*酸素欠乏等.*酸素欠乏症等/,
      );
      expect(
        secondEducationH2s.payload.sources.find(({ article }) =>
          /第2条/.test(article),
        )?.snippet,
      ).toMatch(
        /第2号.*酸素欠乏等.*硫化水素.*第5号.*酸素欠乏症等.*硫化水素中毒/,
      );
      expect(
        secondEducationH2s.payload.sources.find(({ article }) =>
          /第12条/.test(article),
        )?.snippet,
      ).toMatch(
        /第2項[\s\S]*第一号[\s\S]*第二号及び第五号[\s\S]*読み替える/,
      );

      const commonEducationSubjects = await callRoute(
        post,
        mode,
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種でも同じ？",
      );
      expectAnswerFirst(commonEducationSubjects.payload);
      expect(commonEducationSubjects.payload.substantiveAnswer).toMatch(
        /^酸欠則12条.*第3号.*第4号.*第二種の対象外ではなく.*第一種・第二種に共通/,
      );
      expect(commonEducationSubjects.payload.conditions.join(" ")).toMatch(
        /12条2項.*第1項を第二種にも準用.*第3号・第4号は変更しません/,
      );
      const commonSubjectsSource = commonEducationSubjects.payload.sources.find(
        ({ article }) => /第12条/.test(article),
      );
      expect(commonSubjectsSource?.article).toContain("第1項・第2項");
      expect(commonSubjectsSource?.paragraph).toBe("第1項・第2項");
      expect(commonSubjectsSource?.item).toBe("第3号・第4号");
      expect(commonSubjectsSource?.snippet).toMatch(
        /第1項[\s\S]*空気呼吸器等の使用の方法[\s\S]*事故の場合の退避及び救急そ生[\s\S]*第2項[\s\S]*前項の規定[\s\S]*第二号及び第五号/,
      );

      const kanjiCommonEducationSubjects = await callRoute(
        post,
        mode,
        "酸素欠乏症等防止規則第十二条第一項第三号と第四号は第二種でも同じ？",
      );
      expectAnswerFirst(kanjiCommonEducationSubjects.payload);
      expect(kanjiCommonEducationSubjects.payload.substantiveAnswer).toMatch(
        /^酸欠則12条.*第3号.*第4号.*第二種の対象外ではなく.*第一種・第二種に共通/,
      );
      const kanjiCommonSource =
        kanjiCommonEducationSubjects.payload.sources.find(({ article }) =>
          /第12条/.test(article),
        );
      expect(kanjiCommonSource).toMatchObject({
        paragraph: "第1項・第2項",
        item: "第3号・第4号",
      });
      expect(kanjiCommonSource?.snippet).toMatch(
        /第1項[\s\S]*空気呼吸器等の使用の方法[\s\S]*事故の場合の退避及び救急そ生[\s\S]*第2項[\s\S]*前項の規定[\s\S]*第二号及び第五号/,
      );

      for (const query of [
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種にも適用されますか？",
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種にも準用されますか？",
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種の対象ですか？",
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種の対象外ですか？",
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種には適用されないのですか？",
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種には含まれない？",
        "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種にも準用されませんか？",
      ]) {
        const commonSynonym = await callRoute(post, mode, query);
        expectAnswerFirst(commonSynonym.payload);
        expect(commonSynonym.payload.substantiveAnswer).toMatch(
          /^酸欠則12条.*第3号.*第4号.*第二種の対象外ではなく.*第一種・第二種に共通/,
        );
        const commonSynonymSource = commonSynonym.payload.sources.find(
          ({ article }) => /第12条/.test(article),
        );
        expect(commonSynonymSource).toMatchObject({
          paragraph: "第1項・第2項",
          item: "第3号・第4号",
        });
        expect(commonSynonymSource?.snippet).toMatch(
          /第1項[\s\S]*空気呼吸器等の使用の方法[\s\S]*事故の場合の退避及び救急そ生[\s\S]*第2項[\s\S]*前項の規定[\s\S]*第二号及び第五号/,
        );
      }

      const recordRange = await callRoute(
        post,
        mode,
        "酸欠則第3条第2項第1号から第7号の測定記録は？",
      );
      expectAnswerFirst(recordRange.payload);
      const recordSource = recordRange.payload.sources.find(({ article }) =>
        /第3条/.test(article),
      );
      expect(recordSource?.paragraph).toBe("第2項");
      expect(recordSource?.item).toBe("第1号〜第7号");
      expect(recordSource?.snippet).toMatch(
        /測定日時.*測定を実施した者の氏名.*防止措置/,
      );
      expect(recordRange.payload.conditions.join(" ")).toMatch(/講じたとき/);

      const itemSeven = await callRoute(
        post,
        mode,
        "酸欠則第3条第2項第7号とは？",
      );
      expectAnswerFirst(itemSeven.payload);
      expect(itemSeven.payload.substantiveAnswer).toMatch(
        /酸欠則3条2項7号.*防止措置を講じたとき.*措置の概要/,
      );
      expect(itemSeven.payload.substantiveAnswer).not.toMatch(
        /①測定日時|3年間保存/,
      );
      const itemSevenSource = itemSeven.payload.sources.find(({ article }) =>
        /第3条/.test(article),
      );
      expect(itemSevenSource?.paragraph).toBe("第2項");
      expect(itemSevenSource?.item).toBe("第7号");
      expect(itemSevenSource?.snippet).toMatch(
        /防止措置を講じたとき.*措置の概要/,
      );
      expect(itemSeven.payload.sources).toHaveLength(1);
      expect(itemSeven.payload.citations).toHaveLength(1);

      const h2s = await callRoute(post, mode, "第二種酸欠でH2Sは何ppm以下？");
      expectAnswerFirst(h2s.payload);
      expect(h2s.payload.substantiveAnswer).toMatch(/10ppm以下/);
      expect(
        h2s.payload.sources.some(
          ({ article, snippet }) =>
            /第5条/.test(article) &&
            /(?:百万分の十|100万分の10)以下/.test(snippet ?? ""),
        ),
      ).toBe(true);

      const subjects = await callRoute(post, mode, "酸欠特別教育の科目は？");
      expectAnswerFirst(subjects.payload);
      expect(subjects.payload.conditions.join(" ")).toMatch(
        /発生原因.*症状.*退避/,
      );
      expect(subjects.payload.clarificationQuestion).toBeNull();

      const subjectRange = await callRoute(
        post,
        mode,
        "酸欠則第12条第1項第1号から第5号の科目は？",
      );
      expectAnswerFirst(subjectRange.payload);
      expect(subjectRange.payload.substantiveAnswer).toMatch(
        /①酸素欠乏の発生の原因.*②酸素欠乏症の症状.*③空気呼吸器等の使用方法.*④事故時の退避・救急そ生方法.*⑤その他/,
      );
      const subjectRangeSource = subjectRange.payload.sources.find(
        ({ article }) => /第12条/.test(article),
      );
      expect(subjectRangeSource?.paragraph).toBe("第1項");
      expect(subjectRangeSource?.item).toBe("第1号〜第5号");
      expect(subjectRangeSource?.snippet).toMatch(
        /第1号.*発生の原因.*第2号.*症状.*第3号.*空気呼吸器.*第4号.*退避.*第5号/,
      );

      const selectedSubjects = await callRoute(
        post,
        mode,
        "酸欠則第12条第1項第1号、第2号及び第5号は？",
      );
      expectAnswerFirst(selectedSubjects.payload);
      expect(selectedSubjects.payload.substantiveAnswer).toMatch(
        /第1号「酸素欠乏の発生の原因」.*第2号「酸素欠乏症の症状」.*第5号「前各号に掲げるもののほか、酸素欠乏症の防止に関し必要な事項」/,
      );
      const selectedSubjectsSource = selectedSubjects.payload.sources.find(
        ({ article }) => /第12条/.test(article),
      );
      expect(selectedSubjectsSource?.item).toBe("第1号・第2号・第5号");
      expect(selectedSubjectsSource?.snippet).not.toMatch(/第3号|第4号/);

      const supervisor = await callRoute(
        post,
        mode,
        "第二種酸欠作業主任者に必要な技能講習は？",
      );
      expectAnswerFirst(supervisor.payload);
      expect(supervisor.payload.substantiveAnswer).toContain(
        "酸素欠乏・硫化水素危険作業主任者技能講習",
      );
      expect(
        supervisor.payload.sources.find(({ article }) => /第11条/.test(article))
          ?.snippet,
      ).toMatch(/第一種.*第二種.*技能講習/);

      const exception = await callRoute(
        post,
        mode,
        "酸欠で換気できない例外時の保護具は？",
      );
      expectAnswerFirst(exception.payload);
      expect(exception.payload.substantiveAnswer).toMatch(
        /同時就業者数以上.*空気呼吸器/,
      );
      expect(
        exception.payload.sources.some(({ article }) =>
          /第5条の2/.test(article),
        ),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "工作物の石綿事前調査者要件を2026年1月1日施行として扱う ($label)",
    async ({ post, mode }) => {
      const current = await callRoute(
        post,
        mode,
        "工作物の石綿事前調査者は誰？",
      );
      expectAnswerFirst(current.payload);
      expect(current.payload.substantiveAnswer).toContain(
        "工作物石綿事前調査者",
      );
      const datedSources = current.payload.sources.filter(({ article }) =>
        /第3条|第1項/.test(article),
      );
      expect(datedSources.length).toBeGreaterThanOrEqual(2);
      expect(
        datedSources.every(
          ({ effectiveOn, applicationStatus }) =>
            effectiveOn?.includes("令和8年1月1日") &&
            applicationStatus === "current",
        ),
        JSON.stringify(datedSources),
      ).toBe(true);

      const beforeEffective = await callRoute(
        post,
        mode,
        "2025年12月31日時点で工作物の石綿事前調査者は誰？",
      );
      expectAnswerFirst(beforeEffective.payload);
      expect(beforeEffective.payload.substantiveAnswer).not.toContain(
        "工作物石綿事前調査者が行います",
      );
      expect(beforeEffective.payload.answer).toMatch(
        /施行前|確定できません|回答を保留/,
      );
    },
  );

  it.each(executableRouteModes)(
    "石綿事前調査者の複数対象を分岐し、対象別施行日を混同しない ($label)",
    async ({ post, mode }) => {
      const combined = await callRoute(
        post,
        mode,
        "建築物・工作物・船舶の石綿事前調査者は誰？",
      );
      expectAnswerFirst(combined.payload);
      expect(combined.payload.substantiveAnswer).toMatch(
        /建築物.*鋼製船舶.*工作物/,
      );
      expect(combined.payload.substantiveAnswer).toMatch(
        /令和5年10月1日.*令和8年1月1日/,
      );
      const combinedNotice = combined.payload.sources.find(({ sourceKind }) =>
        /mhlw-official-primary/.test(sourceKind ?? ""),
      );
      expect(combinedNotice?.item).toBeUndefined();
      expect(combinedNotice?.effectiveOn).toMatch(
        /令和5年10月1日.*令和8年1月1日/,
      );

      const ship = await callRoute(post, mode, "船舶の石綿事前調査者は誰？");
      expectAnswerFirst(ship.payload);
      expect(ship.payload.substantiveAnswer).toContain(
        "船舶石綿含有資材調査者",
      );
      expect(
        ship.payload.sources
          .filter(({ article }) => /第3条|第1項/.test(article))
          .every(({ effectiveOn }) => effectiveOn?.includes("令和5年10月1日")),
      ).toBe(true);
      expect(
        ship.payload.sources.find(({ sourceKind }) =>
          /mhlw-official-primary/.test(sourceKind ?? ""),
        )?.item,
      ).toBe("第3号");
    },
  );

  it.each(executableRouteModes)(
    "短い根拠・施行日follow-upへ現在の質問を先に答える ($label)",
    async ({ post, mode }) => {
      const cases = [
        ["条文は？", /主な根拠条文/],
        ["何条？", /電気工事士法2条/],
        ["何項？", /安衛法59条(?:第)?3項/],
        ["何号？", /安衛則36条4号/],
        ["公式原文は？", /公式原文/],
        ["告示は？", /特別教育規程/],
        ["例外は？", /対地電圧50V以下/],
        ["いつから？", /開始日は一つではありません/],
      ] as const;
      for (const [message, expected] of cases) {
        const result = await callRoute(
          post,
          mode,
          message,
          [{ role: "user", content: "電気作業の資格は？" }],
          {
            workType: "電気作業",
            equipment: "電気設備",
            qualification: "資格",
          },
        );
        expectAnswerFirst(result.payload);
        expect(result.payload.substantiveAnswer, message).toMatch(expected);
        expect(result.payload.context).toMatchObject({
          topicDomain: "electrical",
          equipment: "電気設備",
        });
        expect(result.payload.answer).not.toMatch(/酸欠|有機溶剤|石綿/);
      }
    },
  );

  it.each(executableRouteModes)(
    "安全管理者から適合しない役割・講習への変更で旧文脈を破棄する ($label)",
    async ({ post, mode }) => {
      const first = await callRoute(post, mode, "安全管理者は必要？");
      expectAnswerFirst(first.payload);
      expect(first.payload.clarificationQuestion).toBe(
        "事業場の主な業種はどれですか？",
      );

      const second = await callRoute(
        post,
        mode,
        "建設業",
        [
          { role: "user", content: "安全管理者は必要？" },
          { role: "assistant", content: first.payload.answer },
        ],
        first.payload.context,
      );
      expectAnswerFirst(second.payload);
      expect(second.payload.context?.equipment).toBe(
        "労働安全衛生法 安全管理者の選任義務",
      );

      for (const testCase of [
        {
          message: "作業主任者は必要？",
          marker: "作業主任者",
          clarification:
            "作業主任者の要否を確認するため、実際の作業名や扱う物質・設備を教えてください。",
          expectedContext: {
            qualificationType: "work-supervisor",
            roleType: "work-supervisor",
          },
        },
        {
          message: "監視人は必要？",
          marker: "監視人",
          clarification:
            "監視人の要否を確認するため、実際の作業名と作業場所を教えてください。",
          expectedContext: { roleType: "monitor" },
        },
        {
          message: "作業指揮者は必要？",
          marker: "作業指揮者",
          clarification:
            "作業指揮者の要否を確認するため、実際の作業名と使用する設備を教えてください。",
          expectedContext: { roleType: "work-leader" },
        },
      ]) {
        const third = await callRoute(
          post,
          mode,
          testCase.message,
          [
            { role: "user", content: "安全管理者は必要？" },
            { role: "assistant", content: first.payload.answer },
            { role: "user", content: "建設業" },
            { role: "assistant", content: second.payload.answer },
          ],
          second.payload.context,
        );
        expectAnswerFirst(third.payload);
        expect(third.payload.substantiveAnswer).toContain(testCase.marker);
        expect(third.payload.answer).not.toContain("安全管理者");
        expect(third.payload.context).toMatchObject(testCase.expectedContext);
        expect(third.payload.context?.equipment).toBeUndefined();
        expect(third.payload.clarificationQuestion).toBe(
          testCase.clarification,
        );
        expect(third.payload.quickReplies).toEqual([]);
        expect(
          third.payload.sources.some(
            ({ law, article }) =>
              law === "労働安全衛生法" && /第11条/.test(article),
          ),
        ).toBe(false);
      }

      const trainingFollowup = await callRoute(
        post,
        mode,
        "技能講習は必要？",
        [
          { role: "user", content: "安全管理者は必要？" },
          { role: "assistant", content: first.payload.answer },
          { role: "user", content: "建設業" },
          { role: "assistant", content: second.payload.answer },
        ],
        second.payload.context,
      );
      expectAnswerFirst(trainingFollowup.payload);
      expect(trainingFollowup.payload.substantiveAnswer).toMatch(
        /技能講習.*一律に満たす制度ではありません/,
      );
      expect(trainingFollowup.payload.context).toMatchObject({
        topicDomain: "general",
        equipment: "労働安全衛生法 安全管理者の選任義務",
        qualificationType: "skills-training",
      });
      expect(
        trainingFollowup.payload.sources.some(
          ({ law, article }) =>
            law === "労働安全衛生規則" && /第5条/.test(article),
        ),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "適合しない旧topicを別役割の質問へ持ち込まない ($label)",
    async ({ post, mode }) => {
      const cases = [
        {
          message: "作業主任者は必要？",
          history: [{ role: "user" as const, content: "熱中症の報告義務は？" }],
          context: { workType: "暑熱作業" },
          staleText: /熱中症|暑熱/,
          staleArticle: /第612条の2/,
          clarification:
            "作業主任者の要否を確認するため、実際の作業名や扱う物質・設備を教えてください。",
        },
        {
          message: "監視人は必要？",
          history: [
            { role: "user" as const, content: "足場の手すりは何センチ？" },
          ],
          context: { workType: "足場作業", equipment: "足場" },
          staleText: /足場/,
          staleArticle: /第(?:518|552|563)条/,
          clarification:
            "監視人の要否を確認するため、実際の作業名と作業場所を教えてください。",
        },
      ];

      for (const testCase of cases) {
        const result = await callRoute(
          post,
          mode,
          testCase.message,
          testCase.history,
          testCase.context,
        );
        expectAnswerFirst(result.payload);
        expect(result.payload.substantiveAnswer).not.toMatch(
          testCase.staleText,
        );
        expect(result.payload.context).not.toHaveProperty("workType");
        expect(result.payload.clarificationQuestion).toBe(
          testCase.clarification,
        );
        expect(
          result.payload.sources.some(({ article }) =>
            testCase.staleArticle.test(article),
          ),
        ).toBe(false);
      }
    },
  );

  it.each(executableRouteModes)(
    "短い現場aspectを旧intentより優先して答える ($label)",
    async ({ post, mode }) => {
      const measurement = await callRoute(
        post,
        mode,
        "測定は？",
        [{ role: "user", content: "酸欠作業の監視人は必要？" }],
        {
          workType: "酸素欠乏危険作業",
          equipment: "酸欠危険場所",
          role: "監視人",
        },
      );
      expectAnswerFirst(measurement.payload);
      expect(measurement.payload.substantiveAnswer).toMatch(
        /作業開始前.*酸素濃度/,
      );
      expect(
        measurement.payload.sources.some(
          ({ law, article }) =>
            /酸素欠乏症等防止規則/.test(law) && /第3条/.test(article),
        ),
      ).toBe(true);

      const controller = await callRoute(
        post,
        mode,
        "作業指揮者は？",
        [{ role: "user", content: "電気作業の資格は？" }],
        {
          workType: "電気作業",
          equipment: "電気設備",
          qualification: "資格",
        },
      );
      expectAnswerFirst(controller.payload);
      expect(controller.payload.substantiveAnswer).toMatch(
        /安衛則.*350条|作業の指揮者/,
      );
      expect(controller.payload.answer).not.toMatch(/酸欠|有機溶剤|石綿/);

      const forkliftController = await callRoute(
        post,
        mode,
        "作業指揮者は必要？",
        [{ role: "user", content: "フォークリフトの資格は？" }],
        {
          workType: "フォークリフト運転",
          equipment: "フォークリフト",
          qualification: "資格",
        },
      );
      expectAnswerFirst(forkliftController.payload);
      expect(forkliftController.payload.context).toMatchObject({
        topicDomain: "forklift",
        equipment: "フォークリフト運転",
        roleType: "work-leader",
      });
      expect(forkliftController.payload.substantiveAnswer).toContain(
        "作業指揮者",
      );
      expect(
        forkliftController.payload.sources.some(
          ({ law, article }) =>
            law === "労働安全衛生規則" && /第151条の4/.test(article),
        ),
      ).toBe(true);

      const openController = await callRoute(post, mode, "作業指揮者は必要？");
      expectAnswerFirst(openController.payload);
      expect(openController.payload.substantiveAnswer).not.toMatch(
        /前の会話内容を確認できない|文脈を推測/,
      );
      expect(openController.payload.context).toMatchObject({
        roleType: "work-leader",
      });

      const unrelatedTopic = await callRoute(
        post,
        mode,
        "有機溶剤の換気は必要？",
        [
          { role: "user", content: "作業指揮者は必要？" },
          { role: "assistant", content: openController.payload.answer },
        ],
        openController.payload.context,
      );
      expectAnswerFirst(unrelatedTopic.payload);
      expect(unrelatedTopic.payload.context).toMatchObject({
        topicDomain: "organic-solvent",
        equipment: "有機溶剤業務",
      });
      expect(unrelatedTopic.payload.context?.roleType).toBeUndefined();
      expect(unrelatedTopic.payload.substantiveAnswer).toMatch(/換気|局所排気/);
      expect(
        unrelatedTopic.payload.sources.some(
          ({ law, article }) =>
            law === "労働安全衛生規則" && /第151条の4/.test(article),
        ),
      ).toBe(false);

      const controllerCondition = await callRoute(
        post,
        mode,
        "フォークリフトを使う作業です",
        [
          { role: "user", content: "作業指揮者は必要？" },
          { role: "assistant", content: openController.payload.answer },
        ],
        openController.payload.context,
      );
      expectAnswerFirst(controllerCondition.payload);
      expect(controllerCondition.payload.context).toMatchObject({
        topicDomain: "forklift",
        equipment: "フォークリフト運転",
        roleType: "work-leader",
      });
      expect(controllerCondition.payload.substantiveAnswer).toContain(
        "作業指揮者",
      );
      expect(
        controllerCondition.payload.sources.some(
          ({ law, article }) =>
            law === "労働安全衛生規則" && /第151条の4/.test(article),
        ),
      ).toBe(true);
    },
  );

  it.each(executableRouteModes)(
    "将来時点の保留後も安全な電気作業文脈を返して作業主任者follow-upへ継続する ($label)",
    async ({ post, mode }) => {
      const future = await callRoute(
        post,
        mode,
        "2027年時点では？",
        undefined,
        { workType: "電気作業", equipment: "電気設備", qualification: "資格" },
      );
      expect(future.payload.context).toMatchObject({
        topicDomain: "electrical",
        equipment: "電気設備",
        workDate: "2027-01-01",
      });

      const followup = await callRoute(
        post,
        mode,
        "作業主任者",
        undefined,
        future.payload.context,
      );
      expectAnswerFirst(followup.payload);
      expect(followup.payload.context).toMatchObject({
        topicDomain: "electrical",
        equipment: "電気設備",
        qualificationType: "work-supervisor",
        workDate: "2027-01-01",
      });
      expect(followup.payload.substantiveAnswer).toMatch(
        /回答を保留|確認できない/,
      );
      expect(followup.payload.answer).not.toMatch(/酸欠|有機溶剤|石綿/);
    },
  );

  it.each(executableRouteModes)(
    "誰・どこ・期限・その対象だけのfollow-upでも直前の法令topicを維持する ($label)",
    async ({ post, mode }) => {
      const cases = [
        {
          initial: "労働者死傷病報告は誰に、いつまで提出？",
          followup: "誰に？",
          context: { workType: "労働者死傷病報告" },
          expectedWorkType: "労働者死傷病報告",
          expectedArticle: /第97条/,
          forbiddenArticle: /第50条|第34条の21/,
        },
        {
          initial: "労働者死傷病報告は誰に、いつまで提出？",
          followup: "いつまで？",
          context: { workType: "労働者死傷病報告" },
          expectedWorkType: "労働者死傷病報告",
          expectedArticle: /第97条/,
          forbiddenArticle: /第50条|第34条の21/,
        },
        {
          initial: "熱中症の報告義務は？",
          followup: "その報告は？",
          context: { workType: "暑熱作業" },
          expectedWorkType: "暑熱作業",
          expectedArticle: /第612条の2/,
          forbiddenArticle: /第34条の21/,
        },
        {
          initial: "足場の点検義務は？",
          followup: "その点検は？",
          context: { workType: "足場作業", equipment: "足場" },
          expectedWorkType: "足場作業",
          expectedArticle: /第567条/,
          forbiddenArticle: /第34条の2/,
        },
        {
          initial: "フォークリフトの資格は？",
          followup: "その教育は？",
          context: {
            workType: "フォークリフト運転",
            equipment: "フォークリフト",
            qualification: "資格",
          },
          expectedWorkType: "フォークリフト運転",
          expectedArticle: /第35条|第36条|第20条|第61条/,
          forbiddenArticle: /第34条の21/,
        },
        {
          initial: "酸欠作業の特別教育は？",
          followup: "その教育は？",
          context: {
            workType: "酸素欠乏危険作業",
            equipment: "酸欠危険場所",
            qualification: "特別教育",
          },
          expectedWorkType: "酸素欠乏危険作業",
          expectedArticle: /第12条/,
          forbiddenArticle: /第34条の21/,
        },
      ];

      for (const testCase of cases) {
        const result = await callRoute(
          post,
          mode,
          testCase.followup,
          [{ role: "user", content: testCase.initial }],
          testCase.context,
        );
        expectAnswerFirst(result.payload);
        expect(result.payload.context?.equipment).toBe(
          testCase.expectedWorkType,
        );
        expect(
          result.payload.sources.some(({ article }) =>
            testCase.expectedArticle.test(article),
          ),
          testCase.initial,
        ).toBe(true);
        expect(
          result.payload.sources.some(({ article }) =>
            testCase.forbiddenArticle.test(article),
          ),
        ).toBe(false);
      }
    },
  );

  it.each(executableRouteModes)(
    "同一災害・荷役familyでも明示した新しい作業を旧設備より優先する ($label)",
    async ({ post, mode }) => {
      const harness = await callRoute(post, mode, "フルハーネスで高さ7mです", [
        { role: "user", content: "足場の手すり高さは？" },
      ]);
      expectAnswerFirst(harness.payload);
      expect(harness.payload.context?.equipment).toBe("墜落制止用器具使用");
      expect(harness.payload.substantiveAnswer).toContain("フルハーネス");
      expect(harness.payload.substantiveAnswer).not.toContain("85cm");

      const sling = await callRoute(post, mode, "玉掛けで1トンです", [
        { role: "user", content: "移動式クレーンの資格は？" },
      ]);
      expectAnswerFirst(sling.payload);
      expect(sling.payload.context?.equipment).toBe("玉掛け");
      expect(sling.payload.substantiveAnswer).toContain("玉掛け");
    },
  );

  it.each(executableRouteModes)(
    "条文特定が難しい現場語でも一次資料の項・号をanswer-firstで返す ($label)",
    async ({ post, mode }) => {
      const injuryReport = await callRoute(
        post,
        mode,
        "休業4日の労災事故はいつまでに報告しますか？",
      );
      expectAnswerFirst(injuryReport.payload);
      expect(injuryReport.payload.substantiveAnswer).toMatch(
        /休業4日以上.*4日ちょうど.*遅滞なく/,
      );
      expect(
        injuryReport.payload.sources.some(
          ({ law, article }) =>
            law === "労働安全衛生規則" && /第97条/.test(article),
        ),
      ).toBe(true);
      expect(injuryReport.payload.answer).not.toMatch(/労災保険法第?7条/);

      const fumigationMonitor = await callRoute(
        post,
        mode,
        "特化則38条の14の監視人はどの号？",
      );
      expectAnswerFirst(fumigationMonitor.payload);
      expect(fumigationMonitor.payload.substantiveAnswer).toMatch(
        /第1項第5号ただし書.*第1項第12号ただし書/,
      );
      const fumigationSource = fumigationMonitor.payload.sources.find(
        ({ law, article }) =>
          law === "特定化学物質障害予防規則" && /第38条の14/.test(article),
      );
      expect(fumigationSource).toMatchObject({
        paragraph: "第1項",
        item: "第5号・第12号",
      });
      expect(fumigationSource?.snippet).toMatch(
        /第5号.*監視人.*第12号.*監視人/,
      );

      const broadMonitor = await callRoute(post, mode, "監視人は必要？");
      expectAnswerFirst(broadMonitor.payload);
      const broadFumigationSource = broadMonitor.payload.sources.find(
        ({ law, article }) =>
          law === "特定化学物質障害予防規則" && /第38条の14/.test(article),
      );
      expect(broadFumigationSource).toMatchObject({
        paragraph: "第1項",
        item: "第5号・第12号",
      });
      expect(broadFumigationSource?.snippet).toMatch(
        /第5号.*監視人.*第12号.*監視人/,
      );

      const oxygenEducation = await callRoute(
        post,
        mode,
        "酸欠則12条1項3号と4号は2種でも要る？",
      );
      expectAnswerFirst(oxygenEducation.payload);
      expect(oxygenEducation.payload.substantiveAnswer).toMatch(
        /第3号.*第4号.*共通/,
      );
      const oxygenSource = oxygenEducation.payload.sources.find(
        ({ law, article }) =>
          law === "酸素欠乏症等防止規則" && /第12条/.test(article),
      );
      expect(oxygenSource).toMatchObject({
        paragraph: "第1項・第2項",
        item: "第3号・第4号",
      });

      expect(oxygenEducation.payload.context).toMatchObject({
        topicDomain: "oxygen-deficiency",
        equipment: "酸素欠乏危険作業",
        qualificationType: "special-education",
      });
      for (const oxygenEducationFollowup of [
        {
          message: "いつまでに受ける？",
          expected: /従事させる時点までに実施/,
        },
        {
          message: "誰が受ける？",
          expected: /対象は.*酸素欠乏危険作業に係る業務へ就く労働者/,
        },
        {
          message: "いつまで？",
          expected: /従事させる時点までに実施/,
        },
        {
          message: "誰が？",
          expected: /対象は.*酸素欠乏危険作業に係る業務へ就く労働者/,
        },
      ]) {
        const followup = await callRoute(
          post,
          mode,
          oxygenEducationFollowup.message,
          [
            {
              role: "user",
              content: "酸欠則12条1項3号と4号は2種でも要る？",
            },
          ],
          oxygenEducation.payload.context,
        );
        expectAnswerFirst(followup.payload);
        expect(followup.payload.substantiveAnswer).toMatch(
          oxygenEducationFollowup.expected,
        );
        expect(
          followup.payload.sources.some(
            ({ law, article }) =>
              law === "酸素欠乏症等防止規則" && /第12条/.test(article),
          ),
        ).toBe(true);
        expect(followup.payload.substantiveAnswer).not.toMatch(
          /作業主任者技能講習.*選任/,
        );
      }

      const scaffoldInspectionInitial = await callRoute(
        post,
        mode,
        "足場の点検は必要？",
      );
      const scaffoldInspectionRecord = await callRoute(
        post,
        mode,
        "その点検は記録するの？",
        [{ role: "user", content: "足場の点検は必要？" }],
        scaffoldInspectionInitial.payload.context,
      );
      expectAnswerFirst(scaffoldInspectionRecord.payload);
      expect(scaffoldInspectionRecord.payload.context?.equipment).toBe(
        "足場作業",
      );
      expect(scaffoldInspectionRecord.payload.substantiveAnswer).toMatch(
        /足場.*点検.*記録|点検.*記録.*足場/,
      );
      expect(
        scaffoldInspectionRecord.payload.sources.find(
          ({ law, article }) =>
            law === "労働安全衛生規則" && /第567条/.test(article),
        ),
      ).toMatchObject({ paragraph: "第3項", item: "第1号・第2号" });
      expect(scaffoldInspectionRecord.payload.sources).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            law: "特定化学物質障害予防規則",
            article: expect.stringMatching(/第34条の2/),
          }),
        ]),
      );

      const secondOxygenEducationInitial = await callRoute(
        post,
        mode,
        "第二種酸素欠乏危険作業の特別教育は必要ですか？",
      );
      const beforeWorkEducation = await callRoute(
        post,
        mode,
        "作業前に受ける必要がある？",
        [
          {
            role: "user",
            content: "第二種酸素欠乏危険作業の特別教育は必要ですか？",
          },
        ],
        secondOxygenEducationInitial.payload.context,
      );
      expectAnswerFirst(beforeWorkEducation.payload);
      expect(beforeWorkEducation.payload.substantiveAnswer).toMatch(
        /従事させる時点までに実施|業務に就かせるとき/,
      );
      expect(
        beforeWorkEducation.payload.sources.find(
          ({ law, article }) =>
            law === "酸素欠乏症等防止規則" && /第12条/.test(article),
        ),
      ).toMatchObject({ paragraph: "第2項" });
      expect(beforeWorkEducation.payload.sources).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            article: expect.stringMatching(/第52条の15/),
          }),
        ]),
      );

      const oxygenInstructorInitial = await callRoute(
        post,
        mode,
        "酸欠作業の特別教育は？",
      );
      for (const instructorFollowup of ["誰が教えるの？", "講師は誰？"]) {
        const oxygenInstructor = await callRoute(
          post,
          mode,
          instructorFollowup,
          [{ role: "user", content: "酸欠作業の特別教育は？" }],
          oxygenInstructorInitial.payload.context,
        );
        expectAnswerFirst(oxygenInstructor.payload);
        expect(oxygenInstructor.payload.context).toMatchObject({
          topicDomain: "oxygen-deficiency",
          equipment: "酸素欠乏危険作業",
          qualificationType: "special-education",
        });
        expect(oxygenInstructor.payload.substantiveAnswer).toMatch(
          /法的義務を負うのは事業者/,
        );
        expect(oxygenInstructor.payload.substantiveAnswer).toMatch(
          /講師個人の資格名までは同条で定めていません/,
        );
        expect(
          oxygenInstructor.payload.sources.some(
            ({ law, article }) =>
              law === "酸素欠乏症等防止規則" && /第12条/.test(article),
          ),
        ).toBe(true);
      }

      const heatRecipient = await callRoute(
        post,
        mode,
        "誰に報告するの？",
        [{ role: "user", content: "熱中症の報告義務は？" }],
        { workType: "暑熱作業" },
      );
      expectAnswerFirst(heatRecipient.payload);
      expect(heatRecipient.payload.substantiveAnswer).toMatch(
        /報告先.*一律に指定していません|誰へ報告するか.*体制/,
      );
      expect(
        heatRecipient.payload.sources.some(({ article }) =>
          /第612条の2/.test(article),
        ),
      ).toBe(true);

      for (const shortRecipient of ["誰に？", "どこへ？"]) {
        const heatShort = await callRoute(
          post,
          mode,
          shortRecipient,
          [{ role: "user", content: "熱中症の報告義務は？" }],
          { workType: "暑熱作業" },
        );
        expectAnswerFirst(heatShort.payload);
        expect(heatShort.payload.substantiveAnswer).toMatch(
          /報告先.*一律に指定していません|誰へ報告するか.*体制/,
        );
        expect(
          heatShort.payload.sources.some(({ article }) =>
            /第612条の2/.test(article),
          ),
        ).toBe(true);
      }

      for (const shortRecipient of ["誰に？", "どこへ？"]) {
        const injuryRecipient = await callRoute(
          post,
          mode,
          shortRecipient,
          [
            {
              role: "user",
              content: "休業4日の労災事故はいつまでに報告しますか？",
            },
          ],
          { workType: "労働者死傷病報告" },
        );
        expectAnswerFirst(injuryRecipient.payload);
        expect(injuryRecipient.payload.substantiveAnswer).toMatch(
          /報告先は、所轄労働基準監督署長/,
        );
        expect(
          injuryRecipient.payload.sources.some(({ article }) =>
            /第97条/.test(article),
          ),
        ).toBe(true);
      }

      const reverseResolvedRecipient = await callRoute(
        post,
        mode,
        "労働者死傷病報告についてです",
        [{ role: "user", content: "報告はどこへ？" }],
        {},
      );
      expectAnswerFirst(reverseResolvedRecipient.payload);
      expect(reverseResolvedRecipient.payload.substantiveAnswer).toMatch(
        /報告先は、所轄労働基準監督署長/,
      );
      expect(
        reverseResolvedRecipient.payload.sources.some(({ article }) =>
          /第97条/.test(article),
        ),
      ).toBe(true);

      const injuryDeadline = await callRoute(
        post,
        mode,
        "いつまで？",
        [
          {
            role: "user",
            content: "休業4日の労災事故はいつまでに報告しますか？",
          },
        ],
        { workType: "労働者死傷病報告" },
      );
      expectAnswerFirst(injuryDeadline.payload);
      expect(injuryDeadline.payload.substantiveAnswer).toMatch(
        /休業4日以上.*4日ちょうど.*遅滞なく/,
      );

      for (const forkliftFollowup of [
        {
          message: "いつまで有効？",
          expected: /有効期限や定期更新は定めていません/,
        },
        {
          message: "誰が受ける？",
          expected: /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
        },
        {
          message: "誰が？",
          expected: /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
        },
      ]) {
        const forklift = await callRoute(
          post,
          mode,
          forkliftFollowup.message,
          [
            {
              role: "user",
              content: "フォークリフトの技能講習は必要？",
            },
          ],
          {
            workType: "フォークリフト運転",
            equipment: "フォークリフト",
            qualification: "技能講習",
          },
        );
        expectAnswerFirst(forklift.payload);
        expect(forklift.payload.substantiveAnswer).toMatch(
          forkliftFollowup.expected,
        );
        expect(forklift.payload.context?.equipment).toBe("フォークリフト運転");
      }

      const genericForkliftInitial = await callRoute(
        post,
        mode,
        "フォークリフトの運転資格は？",
      );
      for (const genericForkliftFollowup of [
        {
          message: "いつまで有効？",
          expected: /有効期限や定期更新は定めていません/,
        },
        {
          message: "誰が受ける？",
          expected: /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
        },
        {
          message: "誰が？",
          expected: /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
        },
      ]) {
        const followup = await callRoute(
          post,
          mode,
          genericForkliftFollowup.message,
          [{ role: "user", content: "フォークリフトの運転資格は？" }],
          genericForkliftInitial.payload.context,
        );
        expectAnswerFirst(followup.payload);
        expect(followup.payload.substantiveAnswer).toMatch(
          genericForkliftFollowup.expected,
        );
        expect(followup.payload.context?.equipment).toBe("フォークリフト運転");
      }
    },
  );
});
