import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postJson } from "./route";
import { POST as postStream } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import type {
  ChatbotRequest,
  ChatbotResponse,
  ChatbotSource,
} from "@/lib/chatbot-contract";

type RoutePost = (request: Request) => Promise<Response>;

const MODES = [
  { label: "JSON", post: postJson, mode: "json" },
  { label: "SSE", post: postStream, mode: "sse" },
] as const;

async function requestAnswer(
  post: RoutePost,
  mode: "json" | "sse",
  body: ChatbotRequest,
): Promise<ChatbotResponse> {
  const response = await post(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, privacyConfirmed: true }),
    }),
  );
  expect(response.status).toBe(200);
  const raw = await response.text();
  if (mode === "json") return JSON.parse(raw) as ChatbotResponse;
  const meta = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1];
  expect(meta).toBeDefined();
  return JSON.parse(meta!) as ChatbotResponse;
}

function expectNormalContract(payload: ChatbotResponse) {
  expect(payload.directAnswer.trim().length).toBeGreaterThan(20);
  expect(payload.substantiveAnswer).toBe(payload.directAnswer);
  expect(payload.answer).toContain(payload.directAnswer);
  expect(payload.assumptions).toEqual(expect.any(Array));
  expect(payload.importantConditions).toEqual(expect.any(Array));
  expect(payload.conditions).toEqual(payload.importantConditions);
  expect(payload.sources.length).toBeGreaterThan(0);
  expect(payload.citations.length).toBeGreaterThan(0);
  expect(payload.quickReplies.length).toBeLessThanOrEqual(3);
  expect(payload.clarificationQuestion?.match(/[？?]/g)?.length ?? 0).toBeLessThanOrEqual(1);
  expect(payload.confidence).toMatch(/^(?:high|medium|low)$/);
  expect(payload.effectiveDateStatus).toMatchObject({
    asOf: "2026-08-09",
    status: "current",
  });
  expect(payload.directAnswer).not.toMatch(/^(?:必要な資格は作業で変わります|条件によって異なります)/);
  expect(payload.directAnswer).not.toBe(payload.clarificationQuestion);
  expect(payload.directAnswer).not.toMatch(/酸欠|有機溶剤|石綿|玉掛け/);
  for (const source of payload.sources) {
    expect(source.url).toMatch(/^https:\/\/(?:laws\.e-gov\.go\.jp|www\.mhlw\.go\.jp|www\.meti\.go\.jp)\//);
    expect(source.applicationStatus).toBe("current");
  }
}

function requiredSource(
  payload: ChatbotResponse,
  lawShort: string,
  article: string,
): { source: ChatbotSource; marker: string } {
  const index = payload.sources.findIndex(
    (candidate) =>
      candidate.lawShort === lawShort && candidate.article.startsWith(article),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  return { source: payload.sources[index]!, marker: `［${index + 1}］` };
}

afterEach(() => {
  vi.unstubAllEnvs();
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
});

describe("電気会話のanswer-first API契約", () => {
  it.each(MODES)("広い点検質問へ一回目から主要分岐を答える ($label)", async ({ post, mode }) => {
    const payload = await requestAnswer(post, mode, {
      message: "電気の点検する時に必要な資格ある？",
      context: {},
      lawCategory: "all",
    });
    expectNormalContract(payload);
    expect(payload.directAnswer).toMatch(/盤の外.*一律の国家資格が必要とは限りません/);
    const substantive = `${payload.directAnswer} ${payload.importantConditions.join(" ")}`;
    expect(substantive).toMatch(/盤を開け.*測定/);
    expect(substantive).toMatch(/高圧・特別高圧/);
    expect(substantive).toMatch(/電気工事士.*特別教育.*別制度/);
    expect(substantive).toMatch(/電気主任技術者.*保安監督/);
    expect(payload.quickReplies.map(({ label }) => label)).toEqual([
      "見るだけ",
      "盤を開けて測定",
      "配線・充電部を扱う",
    ]);
  });

  it.each(MODES)("構造化contextだけで作業開始前点検follow-upを維持する ($label)", async ({ post, mode }) => {
    const first = await requestAnswer(post, mode, {
      message: "電気の点検に資格いる？",
      context: {},
      lawCategory: "all",
    });
    const second = await requestAnswer(post, mode, {
      message: "作業開始前点検",
      context: first.context,
      lawCategory: "all",
    });
    expectNormalContract(second);
    expect(second.context).toMatchObject({
      topicDomain: "electrical",
      workAction: "start-of-work-inspection",
    });
    expect(second.directAnswer).toMatch(/資格名ではなく/);
    expect(second.importantConditions.join(" ")).toMatch(/盤を開けて充電中/);
    expect(second.answer).not.toMatch(/定期自主検査|性能検査/);
  });

  it.each(MODES)(
    "既知条件を再質問せず、盤開放と否定条件を未提示行為へ膨張させない ($label)",
    async ({ post, mode }) => {
      const first = await requestAnswer(post, mode, {
        message: "電気作業の資格は？",
        context: {},
        lawCategory: "all",
      });

      const low = await requestAnswer(post, mode, {
        message: "低圧",
        context: first.context,
        lawCategory: "all",
      });
      expect(low.directAnswer).toMatch(/低圧と分かっている[\s\S]*特別教育対象/);
      const lowInteractive = `${low.clarificationQuestion ?? ""} ${low.quickReplies.map((reply) => reply.label).join(" ")}`;
      expect(lowInteractive).not.toMatch(/高圧|特高|特別高圧|100・200Vか/);

      const highFirst = await requestAnswer(post, mode, {
        message: "電気作業の特別教育について教えて",
        context: {},
        lawCategory: "all",
      });
      const high = await requestAnswer(post, mode, {
        message: "高圧",
        context: highFirst.context,
        lawCategory: "all",
      });
      expect(high.directAnswer).toMatch(/高圧・特別高圧[\s\S]*特別教育の対象/);
      const highInteractive = `${high.clarificationQuestion ?? ""} ${high.quickReplies.map((reply) => reply.label).join(" ")}`;
      expect(highInteractive).not.toMatch(/低圧|100・200V/);

      const openPanel = await requestAnswer(post, mode, {
        message: "盤を開ける",
        context: first.context,
        lawCategory: "all",
      });
      expect(openPanel.context?.workAction).toBe("open-panel");
      expect(openPanel.directAnswer).toMatch(/盤を開けること自体[\s\S]*測定や配線作業と同じ行為では/);
      expect(openPanel.directAnswer).not.toMatch(/盤を開けてテスターを当てる作業/);
      expect(openPanel.clarificationQuestion).toMatch(/見るだけ.*測定・操作/);

      const noWiring = await requestAnswer(post, mode, {
        message: "配線は触らない",
        context: first.context,
        lawCategory: "all",
      });
      expect(noWiring.context?.workAction).not.toBe("visual-inspection");
      expect(noWiring.context?.confirmedChoices).toContain("配線非接触");
      expect(noWiring.directAnswer).toMatch(/配線作業を除外[\s\S]*盤外からの目視[\s\S]*盤を開けた測定[\s\S]*ブレーカー操作/);
      expect(noWiring.quickReplies.map((reply) => reply.label).join(" ")).not.toMatch(/配線.*扱/);

      const breaker = await requestAnswer(post, mode, {
        message: "ブレーカーを入切するだけ",
        context: {},
        lawCategory: "all",
      });
      const enclosed = await requestAnswer(post, mode, {
        message: "充電部分は露出していない",
        context: breaker.context,
        lawCategory: "all",
      });
      expect(enclosed.context?.confirmedChoices).toContain(
        "充電部分は露出していない",
      );
      const enclosedInteractive = `${enclosed.clarificationQuestion ?? ""} ${enclosed.quickReplies.map((reply) => reply.label).join(" ")}`;
      expect(enclosedInteractive).not.toMatch(/露出.*(?:ですか|型)|露出型/);
    },
  );

  it.each(MODES)("電気取扱業務の特別教育を制度・電圧・行為別に答える ($label)", async ({ post, mode }) => {
    const payload = await requestAnswer(post, mode, {
      message: "電気作業の特別教育について教えて",
      context: {},
      lawCategory: "all",
    });
    expectNormalContract(payload);
    expect(payload.directAnswer).toMatch(/国家資格の免状ではありません/);
    const conditions = payload.importantConditions.join(" ");
    expect(conditions).toMatch(/高圧・特別高圧.*敷設・点検・修理・操作/);
    expect(conditions).toMatch(/低圧.*敷設・修理.*露出充電部/);
    expect(conditions).toMatch(/盤外から見るだけ|閉鎖型スイッチ/);
  });

  it.each(MODES)("具体行為へ分類を押し返さず直接答える ($label)", async ({ post, mode }) => {
    const cases = [
      ["ブレーカーを入切するだけ", /閉鎖型ブレーカー.*一律に必要とは限りません/],
      ["盤を開けてテスターを当てる", /見るだけ.*ありません/],
      ["配線をつなぐ", /電線相互の接続.*資格者/],
      ["電気の点検に作業主任者を選ぶ？", /電気作業全般に一律.*作業主任者.*ありません/],
    ] as const;
    for (const [message, expected] of cases) {
      const payload = await requestAnswer(post, mode, {
        message,
        context: {},
        lawCategory: "all",
      });
      expectNormalContract(payload);
      expect(`${payload.directAnswer} ${payload.importantConditions.join(" ")}`).toMatch(expected);
      expect(payload.answer).not.toMatch(/どの点検・検査を確認しますか/);
    }
  });

  it.each(MODES)(
    "電気の作業主任者質問を安衛令6条1号と作業指揮者の根拠へ限定する ($label)",
    async ({ post, mode }) => {
      const payload = await requestAnswer(post, mode, {
        message: "電気の点検に作業主任者を選ぶ？",
        context: {},
        lawCategory: "all",
      });
      expectNormalContract(payload);
      expect(payload.directAnswer).toMatch(
        /電気作業全般に一律[\s\S]*作業主任者[\s\S]*ありません/,
      );
      const decree = payload.sources.find(
        (source) =>
          /安衛令|労働安全衛生法施行令/.test(
            `${source.lawShort ?? ""} ${source.law}`,
          ) && /第6条/.test(source.article),
      );
      expect(decree?.item).toBe("第1号");
      expect(decree?.snippet).toMatch(
        /高圧室内作業[\s\S]*潜函工法[\s\S]*大気圧を超える気圧下/,
      );
      expect(decree?.snippet).not.toMatch(/足場|酸素欠乏|有機溶剤|石綿/);
      expect(
        payload.sources.find(
          (source) =>
            /安衛則|労働安全衛生規則/.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && /第350条/.test(source.article),
        )?.snippet,
      ).toMatch(/作業の指揮者を定めて/);
    },
  );

  it.each(MODES)(
    "低圧347条を接触危険・絶縁保護で説明し高圧の距離規定と分ける ($label)",
    async ({ post, mode }) => {
      const measurement = await requestAnswer(post, mode, {
        message: "盤を開けてテスターを当てる",
        lawCategory: "all",
      });
      expectNormalContract(measurement);
      expect(
        `${measurement.directAnswer} ${measurement.importantConditions.join(" ")}`,
      ).toMatch(
        /低圧で充電電路を直接取り扱い[\s\S]*絶縁用保護具[\s\S]*接触するおそれ[\s\S]*絶縁用防具/,
      );

      const lowVoltage = await requestAnswer(post, mode, {
        message: "100Vの充電部付近で作業する",
        lawCategory: "all",
      });
      expectNormalContract(lowVoltage);
      const lowSubstance = `${lowVoltage.directAnswer} ${lowVoltage.importantConditions.join(" ")}`;
      expect(lowSubstance).toMatch(
        /100Vは低圧[\s\S]*電路・支持物の敷設・点検・修理・塗装[\s\S]*接触[\s\S]*絶縁用防具/,
      );
      expect(lowSubstance).toMatch(/絶縁用保護具[\s\S]*例外/);
      const lowInteractive = [
        lowVoltage.clarificationQuestion ?? "",
        ...lowVoltage.quickReplies.flatMap((reply) => [
          reply.label,
          reply.prompt,
        ]),
      ].join(" ");
      expect(lowInteractive).toMatch(/接触するおそれ|接触のおそれ/);
      expect(lowInteractive).not.toMatch(/距離/);
      expect(lowSubstance).not.toMatch(
        /低圧[^。]*(?:距離の確保|距離に応じた措置|最短距離)/,
      );

      const highVoltage = await requestAnswer(post, mode, {
        message: "高圧線の近くで点検する",
        lawCategory: "all",
      });
      expectNormalContract(highVoltage);
      expect(highVoltage.clarificationQuestion).toMatch(/高圧.*最短距離/);
      expect(highVoltage.quickReplies.map((reply) => reply.label).join(" ")).toMatch(
        /高圧線との距離/,
      );
    },
  );

  it.each(MODES)(
    "AI OFFのテスター測定回答は各markerの活線・近接作業第1項と公式抜粋で支持する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      const payload = await requestAnswer(post, mode, {
        message: "盤を開けてテスターを当てる",
        context: {},
        lawCategory: "all",
      });
      expectNormalContract(payload);
      expect(payload.directAnswer).toMatch(/充電電路.*電圧区分/);

      const expected = [
        ["第346条", /低圧の充電電路の点検.*絶縁用保護具/],
        ["第347条", /低圧の充電電路に近接.*絶縁用防具/],
        ["第341条", /高圧の充電電路の点検.*感電の危険/],
        ["第342条", /充電電路に接触.*接近.*感電の危険/],
      ] as const;
      for (const [article, supportedText] of expected) {
        const { source, marker } = requiredSource(payload, "安衛則", article);
        expect(payload.directAnswer).toContain(marker);
        expect(source.paragraph).toBe("第1項");
        expect(source.item).toBeUndefined();
        expect(source.snippet).toMatch(supportedText);
      }

      const metiQa = requiredSource(payload, "経産省電工Q&A", "Q9・Q10");
      expect(payload.directAnswer).toContain(metiQa.marker);
      expect(metiQa.source.item).toBe("Q10");
      expect(metiQa.source.snippet).toMatch(
        /Q10[\s\S]*測定器をクリップ留め又は巻き付ける場合[\s\S]*電気工事士が工事する必要はありません[\s\S]*電気主任技術者の指示確認/,
      );
      expect(metiQa.source.url).toBe(
        "https://www.meti.go.jp/policy/safety_security/industrial_safety/sangyo/electric/files/kouzi-si-QA201803.pdf",
      );
    },
  );

  it.each(MODES)(
    "経産省Q10の測定器取付け自然文へ電工士要否を先に答え、同じ一次資料を表示する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      for (const message of [
        "測定器をクリップ留めするだけなら電工いる？",
        "屋内配線に測定器を取り付ける場合は電気工事士必要？",
        "経産省電工Q&A Q10",
      ]) {
        __resetChatbotCacheForTests();
        __resetRateLimitForTests();
        const payload = await requestAnswer(post, mode, {
          message,
          context: {},
          lawCategory: "all",
        });
        expectNormalContract(payload);
        expect(payload.context).toMatchObject({
          topicDomain: "electrical",
          workAction: "tester-measurement",
        });
        expect(payload.directAnswer).toMatch(
          /配線を傷付けず[\s\S]*クリップ留め又は巻き付ける[\s\S]*電気工事士が工事する必要はない/,
        );
        expect(payload.directAnswer).toMatch(
          /自家用電気工作物[\s\S]*電気主任技術者の指示確認/,
        );

        const qa = requiredSource(payload, "経産省電工Q&A", "Q9・Q10");
        expect(payload.directAnswer).toContain(qa.marker);
        expect(qa.source.item).toBe("Q10");
        expect(qa.source.snippet).toMatch(
          /Q10[\s\S]*屋内配線を傷付けることが想定されない場合[\s\S]*クリップ留め又は巻き付ける場合[\s\S]*電気主任技術者の指示確認/,
        );
        expect(qa.source.url).toBe(
          "https://www.meti.go.jp/policy/safety_security/industrial_safety/sangyo/electric/files/kouzi-si-QA201803.pdf",
        );

        const live = requiredSource(payload, "安衛則", "第346条");
        const proximity = requiredSource(payload, "安衛則", "第347条");
        const substance = `${payload.directAnswer} ${payload.importantConditions.join(" ")}`;
        expect(substance).toContain(live.marker);
        expect(substance).toContain(proximity.marker);
        expect(substance).toMatch(/直接取り扱い[\s\S]*接触するおそれ/);
        expect(
          payload.sources.map((source) => source.lawShort).join(" "),
        ).not.toMatch(/酸欠則|有機則|石綿則|クレーン則/);

        expect(
          payload.citations.find(
            (citation) => citation.lawShort === "経産省電工Q&A",
          ),
        ).toMatchObject({
          fullName: "経済産業省 よくある質問（電気工事士）",
          issuer: "経済産業省",
          egovHref:
            "https://www.meti.go.jp/policy/safety_security/industrial_safety/sangyo/electric/files/kouzi-si-QA201803.pdf",
        });
      }
    },
  );

  it.each(MODES)(
    "AI OFFの主任技術者回答は電事法43条1・4・5項と対応する公式抜粋で支持する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      const payload = await requestAnswer(post, mode, {
        message: "電気主任技術者がいれば作業できる？",
        context: {},
        lawCategory: "all",
      });
      expectNormalContract(payload);
      expect(payload.directAnswer).toMatch(/保安を監督.*指示に従う/);

      const { source, marker } = requiredSource(payload, "電事法", "第43条");
      expect(payload.directAnswer).toContain(marker);
      expect(source.paragraph).toBe("第1項・第4項・第5項");
      expect(source.item).toBeUndefined();
      expect(source.article).toContain("第43条第1項・第4項・第5項");
      expect(source.snippet).toMatch(
        /第1項.*保安の監督.*第4項.*職務を誠実.*第5項.*指示に従わなければならない/,
      );
      expect(
        payload.citations.find(
          (citation) =>
            citation.lawShort === "電事法" &&
            citation.articleNum === "第43条",
        ),
      ).toMatchObject({
        fullName: "電気事業法",
        issuer: "経済産業省",
        egovHref: "https://laws.e-gov.go.jp/law/339AC0000000170",
      });
    },
  );

  it.each(MODES)(
    "AI OFFの電源・ブレーカー回答は直接markerを安衛則36条4号の対象範囲で支持する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      for (const message of ["電源を入れるだけ", "ブレーカーを操作する"]) {
        const payload = await requestAnswer(post, mode, {
          message,
          context: {},
          lawCategory: "all",
        });
        expectNormalContract(payload);
        expect(payload.directAnswer).toMatch(/一律に必要とは限りません/);

        const { source, marker } = requiredSource(payload, "安衛則", "第36条");
        expect(payload.directAnswer).toContain(marker);
        expect(source.item).toBe("第4号");
        expect(source.snippet).toMatch(
          /第4号[\s\S]*高圧[\s\S]*若しくは特別高圧[\s\S]*点検[\s\S]*操作[\s\S]*低圧[\s\S]*開閉器の操作/,
        );
      }
    },
  );

  it.each(MODES)(
    "AI OFFの広い点検・目視・ブレーカー回答は電工士法2条3項の定義で直接支持する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      for (const message of [
        "電気の点検に資格いる？",
        "盤を見るだけ",
        "ブレーカーを操作する",
      ]) {
        const payload = await requestAnswer(post, mode, {
          message,
          context: {},
          lawCategory: "all",
        });
        expectNormalContract(payload);

        const { source, marker } = requiredSource(
          payload,
          "電気工事士法",
          "第2条",
        );
        expect(payload.directAnswer).toContain(marker);
        expect(source.paragraph).toBe("第3項");
        expect(source.item).toBeUndefined();
        expect(source.article).toContain("第2条第3項");
        expect(source.snippet).toMatch(
          /第3項.*電気工事.*設置し、又は変更する工事.*軽微な工事を除く/,
        );
      }
    },
  );

  it.each(MODES)(
    "AI OFFの配線回答は電工士法2条・3条と停電時の安衛則339条の該当単位で支持する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      const payload = await requestAnswer(post, mode, {
        message: "停電して配線を外す",
        context: {},
        lawCategory: "all",
      });
      expectNormalContract(payload);

      const definition = requiredSource(payload, "電気工事士法", "第2条");
      expect(payload.directAnswer).toContain(definition.marker);
      expect(definition.source.paragraph).toBe("第3項");
      expect(definition.source.snippet).toMatch(
        /第3項.*電気工事.*設置し、又は変更する工事.*軽微な工事を除く/,
      );

      const restriction = requiredSource(payload, "電気工事士法", "第3条");
      expect(payload.directAnswer).toContain(restriction.marker);
      expect(restriction.source.paragraph).toBe(
        "第1項・第2項・第3項・第4項",
      );
      expect(restriction.source.snippet).toMatch(
        /第1項[\s\S]*第一種電気工事士免状[\s\S]*第2項[\s\S]*第二種電気工事士免状[\s\S]*第3項[\s\S]*特種電気工事資格者認定証[\s\S]*第4項[\s\S]*認定電気工事従事者認定証/,
      );

      expect(
        payload.citations.find(
          (citation) => citation.lawShort === "電気工事士法",
        ),
      ).toMatchObject({
        issuer: "経済産業省",
        egovHref: "https://laws.e-gov.go.jp/law/335AC0000000139",
      });
      expect(
        payload.citations.find(
          (citation) => citation.lawShort === "電工士法令",
        ),
      ).toMatchObject({
        fullName: "電気工事士法施行令",
        issuer: "内閣（経済産業省所管）",
        egovHref: "https://laws.e-gov.go.jp/law/335CO0000000260",
      });
      expect(
        payload.citations.find(
          (citation) => citation.lawShort === "電工士法則",
        ),
      ).toMatchObject({
        fullName: "電気工事士法施行規則",
        issuer: "経済産業省",
        egovHref: "https://laws.e-gov.go.jp/law/335M50000400097",
      });

      const deEnergized = requiredSource(payload, "安衛則", "第339条");
      expect(payload.importantConditions.join(" ")).toContain(
        deEnergized.marker,
      );
      expect(deEnergized.source).toMatchObject({
        paragraph: "第1項",
        item: "第1号・第2号・第3号",
      });
      expect(deEnergized.source.snippet).toMatch(
        /第1号[\s\S]*施錠[\s\S]*通電禁止[\s\S]*監視人[\s\S]*第2号[\s\S]*残留電荷[\s\S]*放電[\s\S]*第3号[\s\S]*高圧又は特別高圧[\s\S]*検電器具[\s\S]*短絡接地/,
      );
    },
  );

  it.each(MODES)(
    "AI OFFの電気特別教育回答は5条・6条の学科・実技時間を同じmarkerの公式単位で支持する ($label)",
    async ({ post, mode }) => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      const payload = await requestAnswer(post, mode, {
        message: "電気作業の特別教育について教えて",
        context: {},
        lawCategory: "all",
      });
      expectNormalContract(payload);
      const conditions = payload.importantConditions.join(" ");

      const high = requiredSource(payload, "特別教育規程", "第5条");
      expect(conditions).toContain(high.marker);
      expect(high.source.paragraph).toBe("第1項・第2項・第3項");
      expect(high.source.text).toMatch(
        /11時間以上.*実技15時間以上.*操作の業務のみは1時間以上/,
      );
      expect(high.source.snippet).toMatch(
        /11時間以上.*実技15時間以上.*操作の業務のみは1時間以上/,
      );

      const low = requiredSource(payload, "特別教育規程", "第6条");
      expect(conditions).toContain(low.marker);
      expect(low.source.paragraph).toBe("第1項・第2項・第3項");
      expect(low.source.text).toMatch(
        /7時間以上.*実技7時間以上.*開閉器操作のみは1時間以上/,
      );
      expect(low.source.snippet).toMatch(
        /7時間以上.*実技7時間以上.*開閉器操作のみは1時間以上/,
      );
    },
  );

  it.each(MODES)(
    "初回の空contextで電気同義語を製品分類して回答する ($label)",
    async ({ post, mode }) => {
      const cases = [
        {
          message: "盤の外側を清掃する",
          topicDomain: "electrical",
          context: { workAction: "cleaning" },
          expected: /閉じた低圧の電気盤の外側だけを清掃/,
          forbidden: /ボイラー及び圧力容器安全規則|ボイラー則第21条/,
        },
        {
          message: "低圧と高圧の教育の違い",
          topicDomain: "electrical",
          context: { voltageClass: "高圧" },
          expected: /低圧と高圧・特別高圧.*法定業務の範囲が違います/,
          forbidden: /必要な資格・教育は作業で変わります/,
        },
        {
          message: "メーカー独自の盤で点検資格は何？",
          topicDomain: "electrical",
          context: { workAction: "unknown" },
          expected: /点検中の実際の行為で資格・教育の要件が変わります/,
          forbidden: /作業開始前点検|定期自主検査|性能検査/,
        },
        {
          message: "始業前点検という資格がある？",
          topicDomain: undefined,
          context: { workAction: "start-of-work-inspection" },
          expected: /資格名ではなく.*手順・時点/,
          forbidden: /運転|玉掛け|作業主任者/,
          forbiddenQuickRepliesOnly: true,
        },
      ] as const;

      for (const testCase of cases) {
        const body: ChatbotRequest = {
          message: testCase.message,
          lawCategory: "all",
        };
        expect(body).not.toHaveProperty("context");

        const payload = await requestAnswer(post, mode, body);
        expectNormalContract(payload);
        expect(payload.context).toMatchObject({
          ...testCase.context,
        });
        if (testCase.topicDomain) {
          expect(payload.context?.topicDomain).toBe(testCase.topicDomain);
        } else {
          expect(payload.context?.topicDomain).toBeUndefined();
        }
        expect(
          `${payload.directAnswer} ${payload.importantConditions.join(" ")}`,
        ).toMatch(testCase.expected);
        const forbiddenText =
          "forbiddenQuickRepliesOnly" in testCase
            ? [
                payload.clarificationQuestion ?? "",
                ...payload.quickReplies.flatMap((reply) => [
                  reply.label,
                  reply.prompt,
                ]),
              ].join(" ")
            : payload.answer;
        expect(forbiddenText).not.toMatch(testCase.forbidden);
      }
    },
  );

  it.each(MODES)(
    "安衛則36条4号の50V以下・電信電話回路の除外を結論から適用する ($label)",
    async ({ post, mode }) => {
      const cases = [
        {
          message: "対地電圧24Vの低圧充電電路を敷設する時、特別教育は必要？",
          direct: /対地電圧24V.*特別教育対象から除外/,
        },
        {
          message: "電話用の低圧充電電路を修理する時、特別教育は必要？",
          direct:
            /電話用等.*感電による危害のおそれがない場合.*特別教育対象から除外/,
        },
      ] as const;

      for (const testCase of cases) {
        const payload = await requestAnswer(post, mode, {
          message: testCase.message,
          context: {},
          lawCategory: "all",
        });
        expectNormalContract(payload);
        expect(payload.directAnswer).toMatch(testCase.direct);
        expect(payload.directAnswer).not.toMatch(/^はい.*特別教育が必要/);
        expect(payload.importantConditions.join(" ")).toMatch(
          /電気工事士法.*別|従事制限.*別/,
        );

        const scope = requiredSource(payload, "安衛則", "第36条");
        expect(`${payload.directAnswer} ${payload.importantConditions.join(" ")}`).toContain(
          scope.marker,
        );
        expect(scope.source.item).toBe("第4号");
        expect(scope.source.snippet).toMatch(
          /対地電圧が五十ボルト以下.*電信用のもの.*電話用のもの.*感電による危害を生ずるおそれのないもの/,
        );
      }
    },
  );

  it.each(MODES)(
    "対地電圧50V以下では346条・347条より先に354条の適用除外を答える ($label)",
    async ({ post, mode }) => {
      for (const message of [
        "対地電圧24Vの充電部にテスターを当てる時、346条の保護具は必要？",
        "対地電圧24Vの充電部に近接して点検する時、347条の防具は必要？",
      ]) {
        const payload = await requestAnswer(post, mode, {
          message,
          context: {},
          lawCategory: "all",
        });
        expectNormalContract(payload);
        expect(payload.directAnswer).toMatch(
          /対地電圧24V.*354条.*適用されません.*346条・347条.*一律には適用しません/,
        );
        expect(payload.context?.confirmedChoices).toContain(
          "対地電圧50V以下",
        );
        if (/テスター/.test(message)) {
          expect(payload.context?.energizedState).toBe("energized");
          expect(payload.clarificationQuestion ?? "").not.toMatch(
            /充電中.*停電済み/,
          );
        }
        const exclusion = requiredSource(payload, "安衛則", "第354条");
        expect(exclusion.source.snippet).toMatch(
          /電気機械器具.*配線.*移動電線.*対地電圧が五十ボルト以下.*適用しない/,
        );
        expect(payload.sources.some((source) => source.article.startsWith("第346条"))).toBe(
          false,
        );
        expect(payload.sources.some((source) => source.article.startsWith("第347条"))).toBe(
          false,
        );
      }

      const first = await requestAnswer(post, mode, {
        message: "24V充電したままテスターを当てる",
        context: {},
        lawCategory: "all",
      });
      expect(first.directAnswer).toMatch(
        /24Vが対地電圧であれば.*354条.*一律には適用しません.*対地電圧を確認/,
      );
      expect(first.context).toEqual(
        expect.objectContaining({
          energizedState: "energized",
          confirmedChoices: expect.arrayContaining([
            "50V以下（対地電圧要確認）",
          ]),
        }),
      );
      expect(first.clarificationQuestion ?? "").not.toMatch(
        /充電中.*停電済み/,
      );

      const followup = await requestAnswer(post, mode, {
        message: "充電中",
        context: first.context,
        lawCategory: "all",
      });
      expectNormalContract(followup);
      expect(followup.directAnswer).toMatch(
        /50V以下が対地電圧であれば.*354条.*一律には適用しません.*対地電圧を確認/,
      );
      expect(followup.context?.confirmedChoices).toContain(
        "50V以下（対地電圧要確認）",
      );
      expect(followup.answer).not.toMatch(/346条.*必要|347条.*必要/);
    },
  );
});
