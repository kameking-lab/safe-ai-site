import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { ChatbotResponse } from "@/lib/chatbot-contract";
import type { ChatApiResponse } from "@/lib/types/api";

const generateContent = vi.fn();
const CRANE_REVISION = {
  id: "lr-egov-347M50002000034-20260401",
  title:
    "クレーン等安全規則（労働安全衛生法及び作業環境測定法の一部を改正する法律の一部の施行に伴う関係省令の整備等に関する省令）",
};
const { sharedRateLimitGuard } = vi.hoisted(() => ({
  sharedRateLimitGuard: vi.fn().mockResolvedValue(null),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
vi.mock("@/lib/security/shared-state", () => ({
  sharedRateLimitGuard,
}));

function request(question: string, privacyConfirmed = true) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      revisionId: "revision-1",
      revisionTitle: "労働安全衛生規則の改正",
      question,
      privacyConfirmed,
    }),
  });
}

type LegacyAnswerFirstPayload = ChatApiResponse & ChatbotResponse;

function expectAnswerFirst(payload: LegacyAnswerFirstPayload) {
  expect(payload.reply).toBe(payload.answer);
  expect(payload.substantiveAnswer.trim().length).toBeGreaterThan(0);
  expect(payload.answer.indexOf(payload.substantiveAnswer)).toBeGreaterThanOrEqual(0);
  expect(payload.substantiveAnswer).not.toBe(payload.clarificationQuestion);
  expect(payload.conditions.length).toBeLessThanOrEqual(3);
  expect(payload.quickReplies.length).toBeLessThanOrEqual(3);
  expect(payload.clarification?.options.length ?? 0).toBeLessThanOrEqual(3);
  if (payload.clarificationQuestion) {
    expect(payload.answer.indexOf(payload.clarificationQuestion)).toBeGreaterThan(
      payload.answer.indexOf(payload.substantiveAnswer),
    );
  }
}

describe("POST /api/chat safe compatibility route", () => {
  beforeEach(() => {
    generateContent.mockReset();
    sharedRateLimitGuard.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("legacy APIも実行時計ではなく2026-08-03を回答・施行判定の基準にする", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));

    const response = await POST(request("酸欠作業の監視人は必要？"));
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.answer).toContain("回答基準日: 2026-08-03 JST");
    expect(body.answer).not.toContain("2030-01-01");
    expect(body.sources.length).toBeGreaterThan(0);
    expect(body.sources.every((item) => item.asOf === "2026-08-03")).toBe(true);

    const futureResponse = await POST(
      request("2026年8月4日時点の足場の手すり高さは？"),
    );
    const future = (await futureResponse.json()) as LegacyAnswerFirstPayload;
    expect(future.answer).toContain("回答基準日: 2026-08-03 JST");
    expect(future.answer).toContain("回答を保留");
    expect(future.sources).toEqual([]);
  });

  it("同意がなければRAG・モデル送信前にfail-closedとなる", async () => {
    const response = await POST(request("施行日を教えてください", false));
    expect(response.status).toBe(428);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it.each([
    "意識がなく呼吸していない",
    "山田太郎の電話番号は090-1234-5678です",
    "霞ヶ関ビル改修工事の図面番号ABCD-1234を確認して",
    "作業指揮者は小野太郎です。フォークリフトの速度も教えて",
    "作業員が倒れて返答ありません。どうする？",
    "胸を締め付けられるように痛がっています。",
    "サトウタロウがフォークリフトを運転します。資格は？",
    "私、腰が痛くて薬を飲みました。高所作業はできますか？",
    "新宿区西新宿2-8-1の現場です",
  ])("緊急・PII・機密入力をモデルへ送らない: %s", async (question) => {
    const response = await POST(request(question));
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-ai-used")).toBe("false");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("選択中の法改正文脈を保持し、施行日を一次資料付きで先に答える", async () => {
    const previousGemini = process.env.GEMINI_API_KEY;
    const previousGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const response = await POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            revisionId: CRANE_REVISION.id,
            revisionTitle: CRANE_REVISION.title,
            question: "施行日を教えてください",
            privacyConfirmed: true,
          }),
        }),
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as LegacyAnswerFirstPayload;
      expect(response.headers.get("x-citation-validation")).toBe("evidence-only");
      expect(response.headers.get("x-ai-used")).toBe("false");
      expectAnswerFirst(body);
      expect(body.substantiveAnswer).toContain(CRANE_REVISION.title);
      expect(body.substantiveAnswer).toContain("2026年4月1日");
      expect(body.substantiveAnswer).toContain("施行済み");
      expect(body.clarificationQuestion).toBeNull();
      expect(body.sources).toHaveLength(1);
      expect(body.sources[0]?.url).toBe(
        "https://laws.e-gov.go.jp/law/347M50002000034",
      );
      expect(body.citations[0]).toMatchObject({
        effectiveDate: "2026-04-01",
        articleNum: "改正履歴",
      });
      expect(generateContent).not.toHaveBeenCalled();
    } finally {
      process.env.GEMINI_API_KEY = previousGemini;
      process.env.GOOGLE_API_KEY = previousGoogle;
    }
  });

  it("productionでは匿名callerの遅延・強制エラー指定を無視する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const response = await POST(
      new Request(
        "http://localhost/api/chat?delayMs=999999&forceError=5xx",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-force-error": "timeout",
          },
          body: JSON.stringify({
            revisionId: "revision-1",
            revisionTitle: "労働安全衛生規則の改正",
            question: "資格は必要ですか",
            privacyConfirmed: true,
          }),
        },
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expectAnswerFirst(body);
    expect(body.reply).toContain("必要な資格・教育は作業で変わります");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("曖昧な資格質問は主要制度を先に答えてから条件を1件だけ確認する", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const response = await POST(request("資格は必要ですか"));
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expectAnswerFirst(body);
    expect(body.reply).toContain("必要な資格・教育は作業で変わります");
    expect(body.reply).toContain("免許・技能講習");
    expect(body.reply).toContain("作業主任者");
    expect(body.clarificationQuestion).toContain("作業");
    expect(body.citations.length).toBeGreaterThan(0);
    expect(body.sources.some((source) => /第14条/.test(source.article))).toBe(true);
    expect(body.sources.some((source) => /第59条/.test(source.article))).toBe(true);
    expect(body.sources.some((source) => /第61条/.test(source.article))).toBe(true);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it.each([
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
  ])(
    "legacy AI OFFも対象不明の検査語を無関係条文へ着地させない: $question",
    async ({ question, answerMarker, clarificationMarker }) => {
      vi.stubEnv("GEMINI_API_KEY", "test-key");
      const response = await POST(request(question));
      const body = (await response.json()) as LegacyAnswerFirstPayload;

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expectAnswerFirst(body);
      expect(body.safetyKind).toBe("scope-hold");
      expect(body.source_type).toBe("safety");
      expect(body.substantiveAnswer).toContain(answerMarker);
      expect(body.clarificationQuestion).toContain(clarificationMarker);
      expect(body.sources).toEqual([]);
      expect(body.citations).toEqual([]);
      expect(body.quickReplies).toEqual([]);
      expect(JSON.stringify(body)).not.toMatch(
        /第36条(?:第5号|5号)?|第663条の2/,
      );
      expect(generateContent).not.toHaveBeenCalled();
    },
  );

  it.each(["どの通達？", "指針は？", "法律は？"])(
    "legacyで履歴のない省略質問を無関係な法令へ結び付けない: %s",
    async (question) => {
      const response = await POST(request(question));
      const body = (await response.json()) as LegacyAnswerFirstPayload;

      expect(response.status).toBe(200);
      expectAnswerFirst(body);
      expect(body.substantiveAnswer).toContain("前の会話内容を確認できない");
      expect(body.answer).toContain("法令名・条文番号・作業条件");
      expect(body.sources).toEqual([]);
      expect(body.citations).toEqual([]);
      expect(generateContent).not.toHaveBeenCalled();
    },
  );

  it("短いfollow-upを直前の電気作業文脈へ結合し、無関係なカテゴリへ飛ばさない", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revisionId: "",
          revisionTitle: "選択中の法改正",
          question: "作業主任者",
          history: [{ role: "user", content: "電気作業の資格は？" }],
          privacyConfirmed: true,
        }),
      }),
    );
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toContain("電気作業");
    expect(body.substantiveAnswer).toContain("作業主任者");
    expect(body.answer).not.toMatch(/酸欠|有機溶剤|石綿/);
    expect(body.quickReplies.map((reply) => reply.label)).toEqual([
      "配線工事",
      "充電部・近接作業",
      "操作・点検",
    ]);
  });

  it.each([
    ["何条？", /電気工事士法2条/],
    ["何号？", /安衛則36条4号/],
    ["公式原文は？", /公式原文/],
    ["いつから？", /開始日は一つではありません/],
  ])("legacyでも短い根拠follow-upへ現在の質問を先に答える: %s", async (question, expected) => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revisionId: "",
          revisionTitle: "選択中の法改正",
          question,
          history: [{ role: "user", content: "電気作業の資格は？" }],
          context: {
            workType: "電気作業",
            equipment: "電気設備",
            qualification: "資格",
          },
          privacyConfirmed: true,
        }),
      }),
    );
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toMatch(expected);
    expect(body.answer).not.toMatch(/酸欠|有機溶剤|石綿/);
  });

  it("legacyの信頼済みassistant回答をPIIとして誤遮断せず次の質問へ進む", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revisionId: "",
          revisionTitle: "選択中の法改正",
          question: "測定は？",
          history: [
            { role: "user", content: "酸欠作業の監視人は必要？" },
            {
              role: "assistant",
              content: "作業を常時監視し、異常時に作業主任者へ直ちに通報します。",
            },
          ],
          context: {
            workType: "酸素欠乏危険作業",
            equipment: "酸欠危険場所",
            role: "監視人",
          },
          privacyConfirmed: true,
        }),
      }),
    );
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toMatch(/作業開始前.*酸素濃度/);
    expect(body.answer).not.toContain("個人情報");
  });

  it("legacyも酸欠則3条2項7号の条件付き記録事項を直接答える", async () => {
    const response = await POST(request("酸欠則第3条第2項第7号とは？"));
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toMatch(
      /酸欠則3条2項7号.*防止措置を講じたとき.*措置の概要/,
    );
    expect(body.substantiveAnswer).not.toMatch(/①測定日時|3年間保存/);
    const source = body.sources.find(({ article }) => /第3条/.test(article));
    expect(source?.paragraph).toBe("第2項");
    expect(source?.item).toBe("第7号");
    expect(source?.snippet).toMatch(/防止措置を講じたとき.*措置の概要/);
    expect(body.sources).toHaveLength(1);
    expect(body.citations).toHaveLength(1);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("legacyもフォークリフト複合質問の資格・運用義務を同時に保持する", async () => {
    const cases = [
      {
        question: "フォークリフトの資格と制限速度の設定義務は？",
        expected: ["技能講習修了者等", "制限速度", "毎時10km以下"],
        articles: ["第151条の5"],
      },
      {
        question: "フォークリフトの資格と年1回の定期自主検査の条文は？",
        expected: ["技能講習修了者等", "定期自主検査", "一年を超えない"],
        articles: ["第151条の21"],
      },
      {
        question: "フォークリフトの資格と用途外使用禁止条文は？",
        expected: ["技能講習修了者等", "主たる用途以外", "同条の例外"],
        articles: ["第151条の14"],
      },
      {
        question:
          "フォークリフトの資格、制限速度、主用途外使用、年次検査は？",
        expected: ["制限速度", "定期自主検査", "主たる用途以外"],
        articles: ["第151条の5", "第151条の14", "第151条の21"],
      },
      {
        question: "フォークリフトの資格、速度設定、作業指揮者を教えて",
        expected: ["技能講習修了者等", "制限速度", "作業指揮者"],
        articles: ["第151条の5", "第151条の4"],
      },
    ];

    for (const testCase of cases) {
      const response = await POST(request(testCase.question));
      const body = (await response.json()) as LegacyAnswerFirstPayload;
      expect(response.status).toBe(200);
      expectAnswerFirst(body);
      for (const expected of testCase.expected) {
        expect(body.substantiveAnswer).toContain(expected);
      }
      for (const expectedArticle of testCase.articles) {
        expect(
          body.sources.some((source) => source.article.includes(expectedArticle)),
        ).toBe(true);
      }
      expect(body.sources.some((source) => /第169条の2/.test(source.article))).toBe(
        false,
      );
      expect(generateContent).not.toHaveBeenCalled();
    }
  });

  it.each([
    ["フォークリフトのスピードは誰が決める？", "制限速度", "第151条の5"],
    ["フォークのスピード決めなきゃダメ？", "事業者", "第151条の5"],
    ["フォークリフ卜の年次点険は？", "定期自主検査", "第151条の21"],
    ["フォークリフトの毎月の自主検査必要？", "一月を超えない", "第151条の22"],
    ["フォークリフトの月例検査は？", "一月を超えない", "第151条の22"],
    [
      "フォークリフトの月1回の定期自主検査は？",
      "一月を超えない",
      "第151条の22",
    ],
    ["フォークリフトの指揮する人は必要ですか？", "作業指揮者", "第151条の4"],
    [
      "フォークリフトで人をパレットに乗せていい？",
      "主たる用途以外",
      "第151条の14",
    ],
  ])("legacyの運用質問も荷重確認へ逸らさない: %s", async (
    question,
    expected,
    expectedArticle,
  ) => {
    const response = await POST(request(question));
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toContain(expected);
    expect(body.clarificationQuestion).toBeNull();
    expect(body.quickReplies).toEqual([]);
    expect(
      body.sources.some((source) => source.article.includes(expectedArticle)),
    ).toBe(true);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("legacyも頻度なし定期点検へ月次・年次の両方を返す", async () => {
    const response = await POST(request("フォークリフトの定期点検は？"));
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toContain("月次検査");
    expect(body.substantiveAnswer).toContain("年次検査");
    expect(body.sources.some((source) => /第151条の21/.test(source.article))).toBe(true);
    expect(body.sources.some((source) => /第151条の22/.test(source.article))).toBe(true);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("legacyもつり足場の日常点検を568条へ着地させる", async () => {
    const response = await POST(request("つり足場の使用前点検は何条？"));
    const body = (await response.json()) as LegacyAnswerFirstPayload;
    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toContain("直接根拠は安衛則568条");
    expect(body.clarificationQuestion).toBeNull();
    expect(body.sources.some((source) => /第568条/.test(source.article))).toBe(true);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("legacyも既知の1.5トン条件を技能講習区分として確定する", async () => {
    const response = await POST(request("フォークリフト1.5トンを運転したい"));
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.status).toBe(200);
    expectAnswerFirst(body);
    expect(body.substantiveAnswer).toContain("最大荷重1トン以上");
    expect(body.substantiveAnswer).toContain("技能講習");
    expect(body.clarificationQuestion).toBeNull();
    expect(body.quickReplies).toEqual([]);
    expect(body.sources.some((source) => /第61条/.test(source.article))).toBe(true);
    expect(body.sources.some((source) => /第20条/.test(source.article))).toBe(true);
    for (const source of body.sources) {
      expect(
        body.citations.some(
          (citation) =>
            citation.lawShort === source.lawShort &&
            source.article.includes(citation.articleNum),
        ),
      ).toBe(true);
    }
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("引用番号だけ正しい不支持主張も生成・表示しない", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({
      response: { text: () => "安衛法第61条はすべての作業を無資格で認めています。" },
    });

    const response = await POST(
      request("労働安全衛生法第61条の就業制限について教えてください"),
    );
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-citation-validation")).toBe("evidence-only");
    expect(response.headers.get("x-ai-used")).toBe("false");
    expectAnswerFirst(body);
    expect(body.reply).toContain("就かせてはならない");
    expect(body.reply).not.toContain("無資格で認めています");
    expect(body.sources.some((source) => /第61条/.test(source.article))).toBe(true);
    expect(body.citations.length).toBeGreaterThan(0);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("条文引用のない自由生成本文も生成・表示しない", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({
      response: { text: () => "条件によりますが、おそらく問題ありません。" },
    });

    const response = await POST(
      request("労働安全衛生法第61条の就業制限について教えてください"),
    );
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.headers.get("x-citation-validation")).toBe("evidence-only");
    expectAnswerFirst(body);
    expect(body.reply).toContain("就かせてはならない");
    expect(body.reply).not.toContain("おそらく問題ありません");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("一見正しい自由生成本文も自動検証済みに昇格させない", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({
      response: { text: () => "安衛法第61条は、政令で定める業務の就業制限を定めています。" },
    });

    const response = await POST(
      request("労働安全衛生法第61条の就業制限について教えてください"),
    );
    const body = (await response.json()) as LegacyAnswerFirstPayload;

    expect(response.headers.get("x-citation-validation")).toBe("evidence-only");
    expect(response.headers.get("x-ai-used")).toBe("false");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expectAnswerFirst(body);
    expect(body.reply).toContain("回答基準日");
    expect(body.reply).toContain("就かせてはならない");
    expect(body.sources[0]?.url).toMatch(/^https:\/\/laws\.e-gov\.go\.jp\//);
    expect(body.citations.length).toBeGreaterThan(0);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
