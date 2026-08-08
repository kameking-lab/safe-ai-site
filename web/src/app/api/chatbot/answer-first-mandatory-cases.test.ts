import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postJson } from "./route";
import { POST as postSse } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import {
  CHATBOT_UNANSWERABLE_FALLBACK,
  type ChatbotResponse,
  type ChatTurn,
} from "@/lib/chatbot-contract";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";

type RouteMode = "json" | "sse";
type RoutePost = (request: Request) => Promise<Response>;

const ROUTES = [
  { label: "JSON", mode: "json", post: postJson },
  { label: "SSE", mode: "sse", post: postSse },
] as const satisfies ReadonlyArray<{
  label: string;
  mode: RouteMode;
  post: RoutePost;
}>;

type RouteResult = {
  payload: ChatbotResponse;
  raw: string;
  response: Response;
};

async function callRoute(
  route: (typeof ROUTES)[number],
  message: string,
  history?: ChatTurn[],
): Promise<RouteResult> {
  const endpoint =
    route.mode === "sse" ? "/api/chatbot/stream" : "/api/chatbot";
  const response = await route.post(
    new Request(`http://localhost${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, history, privacyConfirmed: true }),
    }),
  );
  const raw = await response.text();

  if (route.mode === "json") {
    expect(response.headers.get("content-type")).toContain("application/json");
    return {
      response,
      raw,
      payload: JSON.parse(raw) as ChatbotResponse,
    };
  }

  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const metaFrames = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)];
  const encodedPayload = metaFrames.at(-1)?.[1];
  if (!encodedPayload) {
    throw new Error(`SSE meta event missing: ${raw.slice(0, 300)}`);
  }
  return {
    response,
    raw,
    payload: JSON.parse(encodedPayload) as ChatbotResponse,
  };
}

function expectStructuredContract(payload: ChatbotResponse): void {
  expect(typeof payload.answer).toBe("string");
  expect(payload.answer.trim().length).toBeGreaterThan(0);
  expect(typeof payload.substantiveAnswer).toBe("string");
  expect(payload.substantiveAnswer.trim().length).toBeGreaterThan(0);
  expect(payload.substantiveAnswer).not.toBe(CHATBOT_UNANSWERABLE_FALLBACK);
  expect(Array.isArray(payload.assumptions)).toBe(true);
  expect(Array.isArray(payload.conditions)).toBe(true);
  expect(Array.isArray(payload.sources)).toBe(true);
  expect(Array.isArray(payload.citations)).toBe(true);
  expect(Array.isArray(payload.quickReplies)).toBe(true);
  expect(payload.requiresHumanReview).toBe(true);

  expect(payload.assumptions).toHaveLength(
    Math.min(payload.assumptions.length, 3),
  );
  expect(payload.conditions.length).toBeLessThanOrEqual(3);
  expect(payload.quickReplies.length).toBeLessThanOrEqual(3);
  expect(payload.followups?.length ?? 0).toBeLessThanOrEqual(3);
  expect(payload.clarification?.options.length ?? 0).toBeLessThanOrEqual(3);

  expect(payload.substantiveAnswer.trim()).not.toBe(
    payload.clarificationQuestion?.trim(),
  );
  expect(payload.substantiveAnswer.trim()).not.toMatch(/^[^。\n]*[？?]$/);

  const substantiveIndex = payload.answer.indexOf(payload.substantiveAnswer);
  expect(substantiveIndex).toBeGreaterThanOrEqual(0);
  if (payload.clarificationQuestion) {
    const clarificationIndex = payload.answer.indexOf(
      payload.clarificationQuestion,
    );
    expect(clarificationIndex).toBeGreaterThan(substantiveIndex);
    expect(payload.clarification?.question).toBe(
      payload.clarificationQuestion,
    );
  } else {
    expect(payload.quickReplies).toEqual([]);
    expect(payload.clarification).toBeUndefined();
  }
}

function expectSupportedAnswer(payload: ChatbotResponse): void {
  expectStructuredContract(payload);
  expect(payload.source_type).toBe("rag");
  expect(payload.sources.length).toBeGreaterThan(0);
  expect(payload.citations.length).toBeGreaterThan(0);
}

function expectLawSource(
  payload: ChatbotResponse,
  law: RegExp,
  article: RegExp,
): void {
  expect(
    payload.sources.some(
      (source) =>
        law.test(`${source.law} ${source.lawShort ?? ""}`) &&
        article.test(source.article),
    ),
  ).toBe(true);
}

function matchingSource(
  payload: ChatbotResponse,
  law: RegExp,
  article: RegExp,
) {
  return payload.sources.find(
    (source) =>
      law.test(`${source.law} ${source.lawShort ?? ""}`) &&
      article.test(source.article),
  );
}

function expectEverySourceUsed(payload: ChatbotResponse): void {
  const decision = payload.answer.split("\n根拠\n", 1)[0] ?? payload.answer;
  payload.sources.forEach((_, index) => {
    expect(decision).toContain(`［${index + 1}］`);
  });
}

function expectEverySourceCited(payload: ChatbotResponse): void {
  payload.sources.forEach((source) => {
    expect(
      payload.citations.some(
        (citation) =>
          citation.lawShort === source.lawShort &&
          source.article.includes(citation.articleNum),
      ),
    ).toBe(true);
  });
}

beforeEach(() => {
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
});

afterEach(() => {
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("answer-first mandatory conversation cases", () => {
  it.each(ROUTES)(
    "Case 1: 電気作業の資格を先に答えてから一問だけ絞る ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "電気作業の資格は？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toMatch(/電気作業|電気工事/);
      expect(payload.answer).toContain("電気工事士");
      expect(payload.answer).toContain("特別教育");
      expect(payload.clarificationQuestion).toMatch(
        /資格|教育|作業主任者|配線|充電部|操作|点検/,
      );
      expect(payload.quickReplies.length).toBeGreaterThan(0);
      expectLawSource(payload, /電気工事士法/, /第(?:3|三)条/);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第36条/);
      expect(
        matchingSource(payload, /電気工事士法/, /第2条/)?.snippet,
      ).toMatch(/設置し、又は変更/);
      expect(
        matchingSource(payload, /労働安全衛生規則|安衛則/, /第36条/)
          ?.snippet,
      ).toMatch(/充電電路/);
    },
  );

  it.each(ROUTES)(
    "Case 2: 作業主任者follow-upで電気作業の文脈を維持する ($label)",
    async (route) => {
      const first = await callRoute(route, "電気作業の資格は？");
      expect(first.response.status).toBe(200);
      expectSupportedAnswer(first.payload);

      const history: ChatTurn[] = [
        { role: "user", content: "電気作業の資格は？" },
        { role: "assistant", content: first.payload.answer },
      ];
      const followup = await callRoute(route, "作業主任者", history);
      const { payload } = followup;

      expect(followup.response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/電気作業|電気工事/);
      expect(payload.answer).toContain("作業主任者");
      expect(payload.answer).toContain("指定された作業");
      expect(payload.answer).toContain("作業の指揮者");
      expect(payload.answer).toContain("高圧・特別高圧");
      expect(payload.answer).toContain("安衛則350条が安衛則339条");
      expect(payload.answer).toContain("低圧か高圧・特別高圧か");

      const visibleConversation = JSON.stringify({
        answer: payload.answer,
        clarificationQuestion: payload.clarificationQuestion,
        quickReplies: payload.quickReplies,
      });
      expect(visibleConversation).not.toMatch(
        /酸素欠乏|酸欠|有機溶剤|石綿/,
      );
      expectLawSource(payload, /労働安全衛生法(?!施行令)/, /第14条/);
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第6条/);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第350条/);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第36条/);
      expect(
        matchingSource(payload, /労働安全衛生規則|安衛則/, /第350条/)
          ?.snippet,
      ).toContain("作業の指揮者");
      expectEverySourceUsed(payload);
    },
  );

  it.each(ROUTES)(
    "Case 3: フォークリフトは最大荷重の両分岐を先に答える ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "フォークリフトの資格は？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/最大荷重1トン以上/);
      expect(payload.answer).toMatch(/1トン未満/);
      expect(payload.answer).toContain("技能講習");
      expect(payload.answer).toContain("特別教育");
      expect(payload.clarificationQuestion).toMatch(/最大荷重|銘板/);
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第20条/);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第36条/);
    },
  );

  it.each(ROUTES)(
    "Case 4: 足場の手すり高さは代表条件と数値を先に示す ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "足場の手すり高さは？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/2m以上|2メートル以上/);
      expect(payload.answer).toMatch(/85cm以上|85センチメートル以上/);
      expect(payload.answer).toMatch(
        /35(?:cm|センチメートル)以上.*50(?:cm|センチメートル)以下|35[〜～-]50cm/,
      );
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第563条/);
      expect(payload.answer).toContain("墜落により危険を及ぼすおそれのある箇所");
      expect(
        matchingSource(payload, /労働安全衛生規則|安衛則/, /第563条/)
          ?.snippet,
      ).toMatch(/高さ二メートル以上.*墜落により労働者に危険/);
      expect(
        matchingSource(payload, /労働安全衛生規則|安衛則/, /第552条/)
          ?.snippet,
      ).toMatch(/八十五センチメートル以上.*三十五センチメートル以上五十センチメートル以下/);
    },
  );

  it.each(ROUTES)(
    "Case 5: 玉掛けは1トン境界の両分岐を先に答える ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "玉掛けは何トンから？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/1トン以上/);
      expect(payload.answer).toMatch(/1トン未満/);
      expect(payload.answer).toContain("技能講習");
      expect(payload.answer).toContain("特別教育");
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第20条/);
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第10条/);
      expectLawSource(payload, /クレーン等安全規則|クレーン則/, /第221条/);
      expectLawSource(payload, /クレーン等安全規則|クレーン則/, /第222条/);
      expect(
        matchingSource(payload, /労働安全衛生法施行令|安衛令/, /第10条/)
          ?.snippet,
      ).toContain("構造及び材料に応じて負荷させることができる最大の荷重");
    },
  );

  it.each(ROUTES)(
    "Case 6: 高所作業車は10m境界の教育区分を先に答える ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "高所作業車は特別教育いる？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/10m未満|10メートル未満/);
      expect(payload.answer).toContain("特別教育");
      expect(payload.answer).toMatch(/10m以上|10メートル以上/);
      expect(payload.answer).toMatch(/技能講習/);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第36条/);
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第20条/);
      expect(
        matchingSource(payload, /労働安全衛生法施行令|安衛令/, /第10条/)
          ?.snippet,
      ).toMatch(/作業床を最も高く上昇させた場合.*二メートル以上/);
    },
  );

  it.each(ROUTES)(
    "Case 6b: 高所作業車の作業床上の安全帯は194条の22を先に答える ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "高所作業車の作業床における安全帯使用等の条文は？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toContain("安衛則194条の22");
      expect(payload.substantiveAnswer).toContain("要求性能墜落制止用器具等");
      expect(payload.substantiveAnswer).not.toContain("安衛法59条");
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.quickReplies).toEqual([]);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第194条の22/);
    },
  );

  it.each(ROUTES)(
    "Case 6b follow-up: 短い安全帯質問でも高所作業車文脈と194条の22を保つ ($label)",
    async (route) => {
      const { response, payload } = await callRoute(route, "安全帯は？", [
        { role: "user", content: "高所作業車について" },
        {
          role: "assistant",
          content: "高所作業車について、確認したい点を教えてください。",
        },
      ]);

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toContain("安衛則194条の22");
      expect(payload.substantiveAnswer).toContain("要求性能墜落制止用器具等");
      expect(payload.substantiveAnswer).not.toContain("安衛法59条");
      expect(payload.clarificationQuestion).toBeNull();
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第194条の22/);
    },
  );

  it.each(ROUTES)(
    "Case 7: 酸欠作業の監視措置を根拠付きで先に答える ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "酸欠作業の監視人は必要？",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/監視人|監視する者/);
      expect(payload.answer).toMatch(/置く|監視/);
      expectLawSource(payload, /酸素欠乏症等防止規則|酸欠則/, /第13条/);
    },
  );

  it.each(ROUTES)(
    "Case 8: 屋内の有機溶剤は主要措置を先に答える ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "有機溶剤を屋内で使う",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.answer).toMatch(/局所排気|プッシュプル|密閉/);
      expect(payload.answer).toContain("SDS");
      expectLawSource(payload, /有機溶剤中毒予防規則|有機則/, /第5条/);
      expectLawSource(payload, /有機溶剤中毒予防規則|有機則/, /第6条/);
      expectLawSource(payload, /有機溶剤中毒予防規則|有機則/, /第8条/);
      expectLawSource(payload, /有機溶剤中毒予防規則|有機則/, /第9条/);
      expect(payload.answer).toMatch(/臨時作業.*短時間作業/);
    },
  );

  it.each(ROUTES)(
    "Case 9: 手すりだけでも最有力の暫定回答後に一問だけ確認する ($label)",
    async (route) => {
      const { response, payload } = await callRoute(route, "手すりは？");

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.assumptions.join(" ")).toMatch(/足場|最有力|暫定/);
      expect(payload.answer).toMatch(/85cm以上|85センチメートル以上/);
      expect(payload.clarificationQuestion).toMatch(/手すり|場所|設備|足場/);
      expect(payload.quickReplies.length).toBeGreaterThan(0);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第563条/);
      expect(
        matchingSource(payload, /労働安全衛生規則|安衛則/, /第552条/)
          ?.snippet,
      ).toMatch(/八十五センチメートル以上.*三十五センチメートル以上五十センチメートル以下/);
    },
  );

  it.each(ROUTES)(
    "Case 3: 実assistant回答全文を含む荷重follow-upを誤ってPII遮断しない ($label)",
    async (route) => {
      const first = await callRoute(route, "フォークリフトの資格は？");
      const history: ChatTurn[] = [
        { role: "user", content: "フォークリフトの資格は？" },
        { role: "assistant", content: first.payload.answer },
      ];

      for (const [choice, expected] of [
        ["1トン未満", /特別教育/],
        ["1トン以上", /技能講習/],
      ] as const) {
        const followup = await callRoute(route, choice, history);
        expectSupportedAnswer(followup.payload);
        expect(followup.payload.safetyKind).not.toBe("privacy");
        expect(followup.payload.answer).toMatch(expected);
        expectEverySourceUsed(followup.payload);
      }

      const unknown = await callRoute(route, "分からない", history);
      expectStructuredContract(unknown.payload);
      expect(unknown.payload.safetyKind).toBe("ambiguous");
      expect(unknown.payload.answer).toMatch(/最大荷重.*確認/);
      expect(unknown.payload.safetyKind).not.toBe("privacy");
    },
  );

  it.each(ROUTES)(
    "Case 6: 実assistant回答全文を含む全高さfollow-upを正しい区分へ確定する ($label)",
    async (route) => {
      const first = await callRoute(route, "高所作業車は特別教育いる？");
      const history: ChatTurn[] = [
        { role: "user", content: "高所作業車は特別教育いる？" },
        { role: "assistant", content: first.payload.answer },
      ];
      const expectations = [
        ["2m未満", /安衛令10条7号.*該当せず.*対象外/],
        ["2m以上10m未満", /特別教育/],
        ["10m以上", /技能講習/],
      ] as const;

      for (const [choice, expected] of expectations) {
        const followup = await callRoute(route, choice, history);
        expectSupportedAnswer(followup.payload);
        expect(followup.payload.answer).toMatch(expected);
        expect(followup.payload.safetyKind).not.toBe("privacy");
        expectEverySourceUsed(followup.payload);
      }
    },
  );

  it.each(ROUTES)(
    "作業名のない資格質問も制度の主要分岐を答えてから一問だけ確認する ($label)",
    async (route) => {
      const { response, payload } = await callRoute(route, "資格は必要ですか");

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toContain(
        "必要な資格・教育は作業で変わります",
      );
      expect(payload.answer).toContain("免許・技能講習");
      expect(payload.answer).toContain("作業主任者");
      expect(payload.clarificationQuestion).toContain("作業");
      expectLawSource(payload, /労働安全衛生法(?!施行令)/, /第14条/);
      expectLawSource(payload, /労働安全衛生法(?!施行令)/, /第59条/);
      expectLawSource(payload, /労働安全衛生法(?!施行令)/, /第61条/);
    },
  );

  it.each(ROUTES)(
    "単独の作業主任者質問も制度の位置付けを答えてから作業を確認する ($label)",
    async (route) => {
      const { response, payload } = await callRoute(route, "作業主任者");

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toMatch(/すべての作業に共通.*ではなく/);
      expect(payload.substantiveAnswer).toContain("政令で指定された作業");
      expect(payload.clarificationQuestion).toContain("作業主任者");
      expectLawSource(payload, /労働安全衛生法(?!施行令)/, /第14条/);
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第6条/);
    },
  );

  it.each(ROUTES)(
    "フォークリフト複合質問は資格と各運用義務を同じ回答で説明する ($label)",
    async (route) => {
      const cases = [
        {
          message: "フォークリフトの資格と制限速度の設定義務は？",
          expectedText: ["技能講習修了者等", "制限速度", "毎時10km以下"],
          expectedArticles: [/第151条の5(?:\D|$)/],
        },
        {
          message: "フォークリフトの資格と年1回の定期自主検査の条文は？",
          expectedText: ["技能講習修了者等", "定期自主検査", "一年を超えない"],
          expectedArticles: [/第151条の21(?:\D|$)/],
        },
        {
          message: "フォークリフトの資格と用途外使用禁止条文は？",
          expectedText: ["技能講習修了者等", "主たる用途以外", "同条の例外"],
          expectedArticles: [/第151条の14(?:\D|$)/],
        },
        {
          message:
            "フォークリフトの資格、制限速度、主用途外使用、年次検査は？",
          expectedText: [
            "技能講習修了者等",
            "制限速度",
            "定期自主検査",
            "主たる用途以外",
          ],
          expectedArticles: [
            /第151条の5(?:\D|$)/,
            /第151条の14(?:\D|$)/,
            /第151条の21(?:\D|$)/,
          ],
        },
        {
          message:
            "フォークリフトの資格、速度設定、作業指揮者を教えて",
          expectedText: ["技能講習修了者等", "制限速度", "作業指揮者"],
          expectedArticles: [
            /第151条の5(?:\D|$)/,
            /第151条の4(?:\D|$)/,
          ],
        },
      ];

      for (const testCase of cases) {
        const { response, payload } = await callRoute(route, testCase.message);
        expect(response.status).toBe(200);
        expectSupportedAnswer(payload);
        for (const expectedText of testCase.expectedText) {
          expect(payload.substantiveAnswer).toContain(expectedText);
        }
        for (const expectedArticle of testCase.expectedArticles) {
          expectLawSource(payload, /労働安全衛生規則|安衛則/, expectedArticle);
        }
        expect(payload.sources.some((source) => /第169条の2/.test(source.article))).toBe(
          false,
        );
        expectEverySourceUsed(payload);
        expectEverySourceCited(payload);
      }
    },
  );

  it.each(ROUTES)(
    "既知の1.5トン条件は一般論へ戻さず技能講習区分を確定する ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "フォークリフト1.5トンを運転したい",
      );

      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toContain("最大荷重1トン以上");
      expect(payload.substantiveAnswer).toContain("技能講習");
      expect(payload.clarificationQuestion).toBeNull();
      expect(payload.quickReplies).toEqual([]);
      expectLawSource(payload, /労働安全衛生法(?!施行令)/, /第61条/);
      expectLawSource(payload, /労働安全衛生法施行令|安衛令/, /第20条/);
      expectEverySourceUsed(payload);
      expectEverySourceCited(payload);
    },
  );

  it.each(ROUTES)(
    "フォークリフトの運用質問は口語・誤字でも無関係な荷重質問を返さない ($label)",
    async (route) => {
      const cases = [
        {
          message: "フォークリフトのスピードは誰が決める？",
          expected: "制限速度",
          article: /第151条の5(?:\D|$)/,
        },
        {
          message: "フォークのスピード決めなきゃダメ？",
          expected: "事業者",
          article: /第151条の5(?:\D|$)/,
        },
        {
          message: "フォークリフ卜の年次点険は？",
          expected: "定期自主検査",
          article: /第151条の21(?:\D|$)/,
        },
        {
          message: "フォークリフトで人をパレットに乗せていい？",
          expected: "主たる用途以外",
          article: /第151条の14(?:\D|$)/,
        },
        {
          message: "フォークリフト作業の作業指揮者は必要？",
          expected: "作業指揮者",
          article: /第151条の4(?:\D|$)/,
        },
        {
          message: "フォークリフトの指揮する人は必要ですか？",
          expected: "作業指揮者",
          article: /第151条の4(?:\D|$)/,
        },
        {
          message: "フォークリフトの毎月の自主検査必要？",
          expected: "一月を超えない期間ごとに一回",
          article: /第151条の22(?:\D|$)/,
        },
        {
          message: "フォークリフトの月例検査は？",
          expected: "一月を超えない期間ごとに一回",
          article: /第151条の22(?:\D|$)/,
        },
        {
          message: "フォークリフトの月1回の定期自主検査は？",
          expected: "一月を超えない期間ごとに一回",
          article: /第151条の22(?:\D|$)/,
        },
      ];

      for (const testCase of cases) {
        const { response, payload } = await callRoute(route, testCase.message);
        expect(response.status).toBe(200);
        expectSupportedAnswer(payload);
        expect(payload.substantiveAnswer).toContain(testCase.expected);
        expectLawSource(
          payload,
          /労働安全衛生規則|安衛則/,
          testCase.article,
        );
        expect(payload.clarificationQuestion).toBeNull();
        expect(payload.quickReplies).toEqual([]);
        expectEverySourceUsed(payload);
      }
    },
  );

  it.each(ROUTES)(
    "頻度なしの定期点検は月次・年次の両方を回答する ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "フォークリフトの定期点検は？",
      );
      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toContain("月次検査");
      expect(payload.substantiveAnswer).toContain("年次検査");
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第151条の21(?:\D|$)/);
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第151条の22(?:\D|$)/);
      expect(payload.clarificationQuestion ? 1 : 0).toBeLessThanOrEqual(1);
      expectEverySourceUsed(payload);
      expectEverySourceCited(payload);
    },
  );

  it.each(ROUTES)(
    "つり足場の日常点検は568条を答え、567条1項へ誤着地しない ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "つり足場の使用前点検は何条？",
      );
      expect(response.status).toBe(200);
      expectSupportedAnswer(payload);
      expect(payload.substantiveAnswer).toContain("直接根拠は安衛則568条");
      expect(payload.clarificationQuestion).toBeNull();
      expectLawSource(payload, /労働安全衛生規則|安衛則/, /第568条(?:\D|$)/);
      expectEverySourceUsed(payload);
      expectEverySourceCited(payload);
    },
  );

  it.each(ROUTES)(
    "Case 10: 収録外の質問を別法令で代用せず確認先を示す ($label)",
    async (route) => {
      const { response, payload } = await callRoute(
        route,
        "民法の契約解除について教えて",
      );

      expect(response.status).toBe(200);
      expectStructuredContract(payload);
      expect(payload.safetyKind).toBe("source-gap");
      expect(payload.source_type).toBe("safety");
      expect(payload.answer).toMatch(/回答を保留|対象外|収録/);
      expect(payload.answer).toMatch(/確認|公式|所管/);
      expect(payload.sources).toEqual([]);
      expect(payload.citations).toEqual([]);
    },
  );

  it.each(ROUTES)(
    "Case 11: 緊急表現では119案内だけを返し通常法令回答をしない ($label)",
    async (route) => {
      vi.stubEnv("GEMINI_API_KEY", "must-not-be-used");
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { response, payload } = await callRoute(
        route,
        "同僚が倒れてる。どうすれば？",
      );

      expect(response.status).toBe(200);
      expectStructuredContract(payload);
      expect(payload.safetyKind).toBe("emergency");
      expect(payload.source_type).toBe("safety");
      expect(payload.answer).toContain("119");
      expect(payload.answer).not.toMatch(
        /労働安全衛生(?:法|規則)|安衛(?:法|則)|回答基準日/,
      );
      expect(payload.sources).toEqual([]);
      expect(payload.citations).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(ROUTES)(
    "Case 12: PIIを外部送信せず匿名化案内と空の根拠を返す ($label)",
    async (route) => {
      vi.stubEnv("GEMINI_API_KEY", "must-not-be-used");
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const pii = "連絡先 worker@example.com の資格を確認して";

      const { response, payload, raw } = await callRoute(route, pii);

      expect(response.status).toBe(200);
      expectStructuredContract(payload);
      expect(payload.safetyKind).toBe("privacy");
      expect(payload.source_type).toBe("safety");
      expect(payload.answer).toContain("個人情報");
      expect(payload.answer).toMatch(/匿名|削除|伏せ|置き換/);
      expect(raw).not.toContain("worker@example.com");
      expect(payload.sources).toEqual([]);
      expect(payload.citations).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});
