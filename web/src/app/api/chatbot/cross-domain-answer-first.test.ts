import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { POST as POST_STREAM } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import {
  CHATBOT_UNANSWERABLE_FALLBACK,
  isPureClarificationResponse,
  type ChatbotResponse,
} from "@/lib/chatbot-contract";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";

type SemanticRule = {
  label: string;
  test: (text: string, response: ChatbotResponse) => boolean;
};

type AuthorityRule = {
  law: RegExp;
  article: RegExp;
};

type CrossDomainCase = {
  id: string;
  domain: string;
  question: string;
  rules: readonly SemanticRule[];
  authorities: readonly AuthorityRule[];
  allowedQuickReply?: RegExp;
  forbiddenJump: RegExp;
};

const OFFICIAL_HOST = /(?:^|\.)(?:e-gov\.go\.jp|mhlw\.go\.jp|meti\.go\.jp)$/;
const GENERIC_ONLY =
  /^(?:必要な資格(?:・教育)?は作業で変わります|条件によって(?:異なります|変わります)|どの(?:作業|資格|教育).*(?:ですか|確認しますか))[。？?]?$/;

function normalized(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/［\d+］/g, "")
    .replace(/[\s　]+/g, " ")
    .trim();
}

function answerText(response: ChatbotResponse): string {
  return normalized(
    [
      response.directAnswer,
      ...response.importantConditions,
      ...response.assumptions,
    ].join("\n"),
  );
}

function all(label: string, ...patterns: RegExp[]): SemanticRule {
  return {
    label,
    test: (text) => patterns.every((pattern) => pattern.test(text)),
  };
}

function eitherOrder(
  label: string,
  left: RegExp,
  right: RegExp,
): SemanticRule {
  return {
    label,
    test: (text) => {
      const leftIndex = text.search(left);
      const rightIndex = text.search(right);
      return leftIndex >= 0 && rightIndex >= 0;
    },
  };
}

const CASES: readonly CrossDomainCase[] = [
  {
    id: "forklift",
    domain: "フォークリフト",
    question: "フォークリフトの資格は？",
    rules: [
      all("資格を車両の最大荷重で分ける", /最大荷重/, /(?:構造|材料|銘板|仕様)/),
      eitherOrder("1トン未満を特別教育とする", /1トン未満/, /特別教育/),
      eitherOrder("1トン以上を技能講習等とする", /1トン以上/, /技能講習/),
    ],
    authorities: [
      { law: /安衛法|労働安全衛生法/, article: /第59条/ },
      { law: /安衛法|労働安全衛生法/, article: /第61条/ },
      { law: /安衛則|労働安全衛生規則/, article: /第36条/ },
      { law: /安衛令|労働安全衛生法施行令/, article: /第20条/ },
    ],
    allowedQuickReply: /1トン未満|1トン以上|分からない|最大荷重/,
    forbiddenJump: /酸欠|有機溶剤|石綿|電気工事士/,
  },
  {
    id: "slinging",
    domain: "玉掛け",
    question: "玉掛け作業に必要な資格は？",
    rules: [
      all("実際の荷ではなくつり上げ荷重で分ける", /つり上げ荷重/, /(?:実際の荷|つり荷重量|最大荷重)/),
      eitherOrder("1トン未満を特別教育とする", /1トン未満/, /特別教育/),
      eitherOrder("1トン以上を玉掛け技能講習等とする", /1トン以上/, /玉掛け技能講習/),
    ],
    authorities: [
      { law: /クレーン等安全規則|クレーン則/, article: /第221条/ },
      { law: /クレーン等安全規則|クレーン則/, article: /第222条/ },
    ],
    allowedQuickReply: /1トン未満|1トン以上|分からない|つり上げ荷重/,
    forbiddenJump: /酸欠|有機溶剤|石綿|フォークリフト|電気工事士/,
  },
  {
    id: "scaffold",
    domain: "足場",
    question: "足場作業に必要な資格や教育は？",
    rules: [
      all("組立て等の作業者には特別教育が関係する", /足場/, /組立|解体|変更/, /特別教育/),
      all("一定の足場は作業主任者を分けて説明する", /(?:5m|五メートル|高さ)/, /作業主任者/, /技能講習/),
    ],
    authorities: [
      { law: /安衛則|労働安全衛生規則/, article: /第36条/ },
      { law: /安衛令|労働安全衛生法施行令/, article: /第6条/ },
    ],
    allowedQuickReply: /組立|解体|変更|5m|作業主任者|作業者/,
    forbiddenJump: /酸欠|有機溶剤|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "full-harness",
    domain: "フルハーネス",
    question: "フルハーネス作業の特別教育はいつ必要？",
    rules: [
      all("2m以上かつ作業床を設けにくい場所を対象とする", /(?:2m|二メートル)以上/, /作業床/, /(?:困難|設けにくい)/),
      all("フルハーネス型を用いる作業の特別教育とする", /フルハーネス/, /特別教育/, /必要/),
    ],
    authorities: [
      { law: /安衛法|労働安全衛生法/, article: /第59条/ },
      { law: /安衛則|労働安全衛生規則/, article: /第36条/ },
    ],
    allowedQuickReply: /作業床|2m|フルハーネス|ロープ高所/,
    forbiddenJump: /酸欠|有機溶剤|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "aerial-work-platform",
    domain: "高所作業車",
    question: "高所作業車の運転に必要な資格は？",
    rules: [
      all("銘板等の作業床最高高さで判定する", /作業床/, /(?:最高高さ|最大)/),
      all("10m未満と10m以上を教育・講習に分ける", /10m未満/, /10m以上/, /特別教育/, /技能講習/),
    ],
    authorities: [
      { law: /安衛則|労働安全衛生規則/, article: /第36条/ },
      { law: /安衛令|労働安全衛生法施行令/, article: /第20条/ },
      { law: /安衛法|労働安全衛生法/, article: /第61条/ },
    ],
    allowedQuickReply: /2m未満|2m以上10m未満|10m以上|作業床/,
    forbiddenJump: /酸欠|有機溶剤|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "oxygen-deficiency",
    domain: "酸欠",
    question: "酸欠作業に必要な特別教育と作業主任者は？",
    rules: [
      all("対象労働者への特別教育を示す", /酸素欠乏危険作業|酸欠作業/, /特別教育/, /(?:労働者|業務に就かせ)/),
      all("第一種と第二種で主任者講習を分ける", /第一種/, /第二種/, /作業主任者/, /技能講習/, /硫化水素/),
    ],
    authorities: [
      { law: /酸欠則|酸素欠乏症等防止規則/, article: /第11条/ },
      { law: /酸欠則|酸素欠乏症等防止規則/, article: /第12条/ },
    ],
    allowedQuickReply: /第一種|第二種|タンク|ピット|マンホール|坑内|作業主任者|特別教育/,
    forbiddenJump: /有機溶剤|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "organic-solvent",
    domain: "有機溶剤",
    question: "有機溶剤作業の主な条件と必要な設備は？",
    rules: [
      all("SDSで種別を確認する", /SDS/, /第一種|第1種/, /第二種|第2種/, /第三種|第3種/),
      all("屋内・タンク内外・換気設備を主要分岐にする", /屋内/, /タンク/, /(?:密閉設備|局所排気|プッシュプル|全体換気)/),
    ],
    authorities: [
      { law: /有機則|有機溶剤中毒予防規則/, article: /第1条/ },
      { law: /有機則|有機溶剤中毒予防規則/, article: /第5条/ },
      { law: /有機則|有機溶剤中毒予防規則/, article: /第6条/ },
    ],
    allowedQuickReply: /第1種|第2種|第3種|タンク|屋内|吹付け|不明/,
    forbiddenJump: /酸欠|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "asbestos",
    domain: "石綿",
    question: "石綿の事前調査に必要な資格は？",
    rules: [
      all("対象物で調査者区分を分ける", /建築物/, /工作物/, /船舶/, /調査者/),
      all("建築物・船舶と工作物の適用時期を区別する", /令和5年10月1日/, /令和8年1月1日/),
    ],
    authorities: [
      { law: /石綿障害予防規則|石綿則/, article: /第3条/ },
      { law: /告示276号/, article: /第1項/ },
    ],
    allowedQuickReply: /建築物|工作物|船舶/,
    forbiddenJump: /酸欠|有機溶剤|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "crane",
    domain: "クレーン",
    question: "クレーン運転の資格は？",
    rules: [
      all("クレーン種類とつり上げ荷重が資格を変える", /クレーン/, /つり上げ荷重/, /(?:種類|移動式|デリック)/),
      all("少なくとも免許・技能講習・特別教育の区分を示す", /免許/, /技能講習/, /特別教育/),
    ],
    authorities: [
      { law: /安衛法|労働安全衛生法/, article: /第61条/ },
      { law: /クレーン等安全規則|クレーン則|安衛令/, article: /第(?:22|67|68|20)条/ },
    ],
    allowedQuickReply:
      /クレーン|移動式クレーン|デリック|つり上げ荷重|5トン|床上操作式/,
    forbiddenJump: /酸欠|有機溶剤|石綿|フォークリフト|電気工事士/,
  },
  {
    id: "heat-illness",
    domain: "熱中症",
    question: "職場の熱中症対策で義務になることは？",
    rules: [
      all("報告体制を整備・周知する", /(?:報告|連絡)/, /体制/, /(?:整備|定め)/, /周知/),
      all("離脱・冷却・受診等の手順を定める", /離脱/, /冷却/, /受診/, /手順/),
      all("熱中症のおそれがある作業に適用する", /熱中症/, /おそれ/, /作業/),
    ],
    authorities: [
      { law: /安衛則|労働安全衛生規則/, article: /第612条の2/ },
    ],
    allowedQuickReply: /対象作業|報告|連絡|手順|体制|WBGT/,
    forbiddenJump: /酸欠|有機溶剤|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "chemical-manager",
    domain: "化学物質管理者",
    question: "化学物質管理者はいつ、どの事業場で必要？",
    rules: [
      all("RA対象物の製造・取扱事業場を対象とする", /リスクアセスメント対象物|RA対象物/, /製造|取り扱/, /事業場/),
      all("選任時期を具体化する", /選任/, /(?:14日|十四日|事由)/),
      all("製造事業場と取扱事業場で資格要件を区別する", /製造事業場/, /取扱|取り扱/, /講習/),
    ],
    authorities: [
      { law: /安衛則|労働安全衛生規則/, article: /第12条の5/ },
    ],
    allowedQuickReply: /製造|取扱|選任|講習|RA対象物|事業場|譲渡・提供/,
    forbiddenJump: /酸欠|石綿|玉掛け|フォークリフト|電気工事士/,
  },
  {
    id: "work-supervisor",
    domain: "作業主任者",
    question: "作業主任者は必要？",
    rules: [
      all("全作業共通でなく指定作業ごとの制度と説明する", /作業主任者/, /(?:すべての作業|全作業|共通)/, /(?:政令|指定された作業)/),
      all("実作業を安衛令6条に照合すると示す", /安衛令6条|安衛令第6条/, /(?:列挙|該当|照合)/),
    ],
    authorities: [
      { law: /安衛法|労働安全衛生法/, article: /第14条/ },
      { law: /安衛令|労働安全衛生法施行令/, article: /第6条/ },
    ],
    forbiddenJump: /電気作業|玉掛け|フォークリフト|クレーン運転/,
  },
  {
    id: "special-education",
    domain: "特別教育",
    question: "特別教育とは何で、いつ必要？",
    rules: [
      all("省令指定の危険有害業務へ就かせる前の教育と説明する", /危険・有害|危険有害/, /(?:省令|安衛則36条)/, /(?:就かせるとき|就業前|業務に就かせ)/),
      all("作業ごとに対象号を確認すると示す", /作業/, /対象号|36条/, /確認/),
    ],
    authorities: [
      { law: /安衛法|労働安全衛生法/, article: /第59条/ },
      { law: /安衛則|労働安全衛生規則/, article: /第36条/ },
    ],
    allowedQuickReply: /高所作業車|低圧電気|研削といし|作業/,
    forbiddenJump: /酸欠|有機溶剤|石綿|玉掛け|フォークリフト/,
  },
  {
    id: "skill-training",
    domain: "技能講習",
    question: "技能講習とは何で、いつ必要？",
    rules: [
      all("政令指定の就業制限業務と説明する", /就業制限/, /(?:政令|安衛令)/, /技能講習/),
      all("免許・技能講習等の資格者に限ると説明する", /免許/, /技能講習/, /(?:限られ|資格者)/),
    ],
    authorities: [
      { law: /安衛法|労働安全衛生法/, article: /第61条/ },
    ],
    forbiddenJump: /電気作業|酸欠|有機溶剤|石綿|玉掛け|フォークリフト/,
  },
] as const;

async function callRoute(question: string): Promise<ChatbotResponse> {
  const response = await POST(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: question,
        privacyConfirmed: true,
        lawCategory: "all",
      }),
    }),
  );
  const raw = await response.text();
  expect(response.status, raw).toBe(200);
  return JSON.parse(raw) as ChatbotResponse;
}

async function callRouteMode(
  question: string,
  mode: "json" | "sse",
  context?: ChatbotResponse["context"],
): Promise<ChatbotResponse> {
  const response = await (mode === "json" ? POST : POST_STREAM)(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: question,
        privacyConfirmed: true,
        lawCategory: "all",
        ...(context ? { context } : {}),
      }),
    }),
  );
  const raw = await response.text();
  expect(response.status, raw).toBe(200);
  if (mode === "json") return JSON.parse(raw) as ChatbotResponse;
  const meta = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1];
  expect(meta).toBeDefined();
  return JSON.parse(meta!) as ChatbotResponse;
}

function citationMatchesSource(response: ChatbotResponse): boolean {
  return response.citations.every((citation) =>
    response.sources.some(
      (source) =>
        `${source.law} ${source.lawShort ?? ""}`.includes(citation.lawShort) &&
        source.article.includes(citation.articleNum),
    ),
  );
}

function hasAuthority(
  response: ChatbotResponse,
  authority: AuthorityRule,
): boolean {
  return response.citations.some(
    (citation) =>
      authority.law.test(`${citation.fullName} ${citation.lawShort}`) &&
      authority.article.test(citation.articleNum),
  );
}

beforeEach(() => {
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
});

describe("既存他分野の意味ベースanswer-first回帰", () => {
  it.each(CASES)(
    "$id: $domain の広い質問でも追加入力なしで判断材料を返す",
    async (testCase) => {
      const response = await callRoute(testCase.question);
      const text = answerText(response);
      const visibleConversation = normalized(
        [
          response.directAnswer,
          ...response.importantConditions,
          response.clarificationQuestion ?? "",
          ...response.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
        ].join("\n"),
      );

      expect(response.directAnswer.trim(), testCase.id).not.toBe("");
      expect(response.directAnswer, testCase.id).not.toBe(
        CHATBOT_UNANSWERABLE_FALLBACK,
      );
      expect(normalized(response.directAnswer), testCase.id).not.toMatch(
        GENERIC_ONLY,
      );
      expect(response.directAnswer.length, testCase.id).toBeGreaterThan(30);
      expect(isPureClarificationResponse(response), testCase.id).toBe(false);
      const directAnswerIndex = response.answer.indexOf(response.directAnswer);
      expect(directAnswerIndex, testCase.id).toBeGreaterThanOrEqual(0);
      if (response.clarificationQuestion) {
        expect(
          response.answer.indexOf(response.clarificationQuestion),
          testCase.id,
        ).toBeGreaterThan(directAnswerIndex);
      }
      expect((response.answer.match(/[？?]/g) ?? []).length, testCase.id).toBeLessThanOrEqual(1);
      expect(response.quickReplies.length, testCase.id).toBeLessThanOrEqual(3);
      expect(response.clarification?.options.length ?? 0, testCase.id).toBeLessThanOrEqual(3);

      for (const rule of testCase.rules) {
        expect(rule.test(text, response), `${testCase.id}: ${rule.label}\n${text}`).toBe(
          true,
        );
      }

      expect(response.source_type, testCase.id).toBe("rag");
      expect(response.sources.length, testCase.id).toBeGreaterThan(0);
      expect(response.citations.length, testCase.id).toBeGreaterThan(0);
      expect(citationMatchesSource(response), testCase.id).toBe(true);
      expect(
        response.sources.every((source) => {
          if (!source.url) return false;
          try {
            return OFFICIAL_HOST.test(new URL(source.url).hostname.toLowerCase());
          } catch {
            return false;
          }
        }),
        `${testCase.id}: non-official or missing source URL`,
      ).toBe(true);
      for (const authority of testCase.authorities) {
        expect(
          hasAuthority(response, authority),
          `${testCase.id}: missing ${authority.law}/${authority.article}`,
        ).toBe(true);
      }

      expect(visibleConversation, testCase.id).not.toMatch(testCase.forbiddenJump);
      if (response.quickReplies.length > 0) {
        expect(testCase.allowedQuickReply, `${testCase.id}: unexpected quick replies`).toBeDefined();
        for (const reply of response.quickReplies) {
          expect(
            testCase.allowedQuickReply!.test(`${reply.label} ${reply.prompt}`),
            `${testCase.id}: unrelated quick reply ${reply.label}`,
          ).toBe(true);
        }
      }
    },
    20_000,
  );
});

const NATURAL_VARIANTS = [
  {
    id: "organic-natural",
    question: "シンナーを屋内で扱う。どんな資格と対策が必要？",
    answer: /有機溶剤作業主任者技能講習[\s\S]*作業者全員.*ではありません/,
    condition: /局所排気[\s\S]*臨時・短時間/,
    source: [/有機則第19条/, /有機則第5条/, /有機則第8条/, /有機則第9条/],
    sourceLocator: {
      law: /安衛法|労働安全衛生法/,
      article: /第57条の2/,
      paragraph: "第1項",
      item: "第2号",
      snippet: /成分及びその含有量/,
    },
    additionalSourceLocators: [
      {
        law: /有機則|有機溶剤中毒予防規則/,
        article: /第1条/,
        paragraph: "第1項",
        item: "第2号",
        snippet: /有機溶剤含有物[\s\S]*重量の五パーセントを超えて含有/,
      },
      {
        law: /有機則|有機溶剤中毒予防規則/,
        article: /第5条/,
        paragraph: "第1項",
        snippet: /第一種有機溶剤等又は第二種有機溶剤等[\s\S]*局所排気装置/,
      },
    ],
    poison: /酸欠則|石綿則|電気工事士法/,
  },
  {
    id: "asbestos-natural",
    question: "アスベスト除去作業には何が必要？",
    answer: /労働者には特別教育[\s\S]*石綿作業主任者技能講習/,
    condition: /事前調査者[\s\S]*置き換わる資格ではありません/,
    source: [/安衛則第36条/, /石綿則第19条/, /石綿則第3条/],
    sourceLocator: {
      law: /石綿則|石綿障害予防規則/,
      article: /第3条/,
      paragraph: "第1項",
      snippet: /解体又は改修[\s\S]*石綿等の使用の有無を調査/,
    },
    poison: /酸欠則|有機則|電気工事士法/,
  },
  {
    id: "oxygen-natural",
    question: "酸欠作業には何が必要？",
    answer: /作業者本人への特別教育[\s\S]*作業主任者の選任/,
    condition: /作業開始前.*測定[\s\S]*換気[\s\S]*常時監視/,
    source: [
      /安衛法第59条/,
      /安衛則第36条/,
      /酸欠則第11条/,
      /酸欠則第12条/,
      /酸欠則第13条/,
    ],
    additionalSourceLocators: [
      {
        law: /安衛法|労働安全衛生法/,
        article: /第59条/,
        paragraph: "第3項",
        snippet: /危険又は有害な業務[\s\S]*特別の教育/,
      },
      {
        law: /酸欠則|酸素欠乏症等防止規則/,
        article: /第3条/,
        paragraph: "第1項・第2項",
        item: "第1号・第2号・第3号・第4号・第5号・第6号・第7号",
        snippet: /その日の作業を開始する前[\s\S]*測定を実施した者の氏名/,
      },
      {
        law: /酸欠則|酸素欠乏症等防止規則/,
        article: /第5条/,
        paragraph: "第1項",
        snippet: /酸素の濃度を十八パーセント以上[\s\S]*換気/,
      },
      {
        law: /酸欠則|酸素欠乏症等防止規則/,
        article: /第11条/,
        paragraph: "第1項",
        snippet: /酸素欠乏危険作業主任者技能講習[\s\S]*作業主任者を選任/,
      },
      {
        law: /酸欠則|酸素欠乏症等防止規則/,
        article: /第12条/,
        paragraph: "第1項・第2項",
        item: "第1号・第2号・第3号・第4号・第5号",
        snippet: /酸素欠乏の発生の原因[\s\S]*第二種酸素欠乏危険作業に係る業務について準用/,
      },
      {
        law: /酸欠則|酸素欠乏症等防止規則/,
        article: /第13条/,
        paragraph: "第1項",
        snippet: /常時作業の状況を監視[\s\S]*通報する者を置く/,
      },
    ],
    poison: /石綿則|有機則|電気工事士法/,
  },
  {
    id: "work-supervisor-required-natural",
    question: "作業主任者が必要な作業は？",
    answer:
      /全作業に共通する資格ではなく[\s\S]*高さ5m以上[\s\S]*酸素欠乏危険場所[\s\S]*有機溶剤業務[\s\S]*石綿等/,
    condition: /免許・技能講習[\s\S]*作業ごとに異なる/,
    source: [/安衛法第14条/, /安衛令第6条/],
    sourceLocator: {
      law: /安衛令|労働安全衛生法施行令/,
      article: /第6条/,
      item: "第15号・第21号・第22号・第23号",
      snippet:
        /第15号[\s\S]*高さが五メートル以上[\s\S]*第21号[\s\S]*酸素欠乏危険場所[\s\S]*第22号[\s\S]*有機溶剤[\s\S]*第23号[\s\S]*石綿等/,
    },
    poison: /電気工事士法|クレーン則/,
  },
  {
    id: "scaffold-qualification-natural",
    question: "足場の資格は？",
    answer: /組立て・解体・変更[\s\S]*作業者には[\s\S]*特別教育/,
    condition: /高さ5m以上[\s\S]*作業主任者[\s\S]*技能講習/,
    clarification:
      /作業者として組立て等を行う場合の特別教育と、作業主任者として選任される要件のどちら/,
    clarificationForbidden: /つり|張出し|5m|五メートル/,
    source: [/安衛則第36条/, /安衛令第6条/],
    sourceLocator: {
      law: /安衛令|労働安全衛生法施行令/,
      article: /第6条/,
      item: "第15号",
      snippet: /高さが五メートル以上[\s\S]*足場の組立て、解体又は変更/,
    },
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "heat-natural",
    question: "熱中症対策を教えて",
    answer:
      /WBGT[\s\S]*休止・休憩[\s\S]*暑熱順化[\s\S]*水分・塩分[\s\S]*2025年6月1日施行[\s\S]*報告させる体制/,
    condition: /作業からの離脱[\s\S]*身体の冷却[\s\S]*受診[\s\S]*2026年ガイドライン/,
    source: [/安衛則第612条の2/, /熱中症ガイドライン第2・第3/],
    sourceLocator: {
      law: /熱中症ガイドライン|職場における熱中症防止/,
      article: /第2・第3/,
      snippet:
        /WBGT[\s\S]*休憩[\s\S]*暑熱順化[\s\S]*水分及び塩分/,
    },
    poison: /酸欠則|石綿則|有機則/,
  },
  {
    id: "special-education-kinds-natural",
    question: "特別教育の種類を教えて",
    answer: /研削といし[\s\S]*高所作業車[\s\S]*足場[\s\S]*フルハーネス/,
    condition: /技能講習や免許側へ変わる/,
    source: [/安衛法第59条/, /安衛則第36条/],
    sourceLocator: {
      law: /安衛則|労働安全衛生規則/,
      article: /第36条/,
      item: "第1号・第10号の5・第39号・第41号",
      snippet:
        /第1号[\s\S]*研削といし[\s\S]*第10号の5[\s\S]*高所作業車[\s\S]*第39号[\s\S]*足場[\s\S]*第41号[\s\S]*墜落制止用器具/,
    },
    poison: /酸欠則|石綿則|有機則|電気工事士法/,
  },
  {
    id: "skills-kinds-natural",
    question: "技能講習の種類を教えて",
    answer: /高所作業車[\s\S]*車両系建設機械[\s\S]*溶接・溶断/,
    condition: /免許・技能講習・特別教育/,
    source: [/安衛法第61条/, /安衛令第20条/],
    sourceLocator: {
      law: /安衛令|労働安全衛生法施行令/,
      article: /第20条/,
      item: "第10号・第12号・第15号",
      snippet:
        /第10号[\s\S]*可燃性ガス[\s\S]*第12号[\s\S]*三トン以上[\s\S]*第15号[\s\S]*十メートル以上/,
    },
    additionalSourceLocators: [
      {
        law: /安衛法|労働安全衛生法/,
        article: /第61条/,
        paragraph: "第1項",
        snippet: /技能講習を修了した者[\s\S]*業務に就かせてはならない/,
      },
    ],
    poison: /酸欠則|石綿則|有機則|電気工事士法/,
  },
  {
    id: "skills-required-natural",
    question: "技能講習が必要な作業は？",
    answer: /高所作業車[\s\S]*車両系建設機械[\s\S]*溶接・溶断/,
    condition: /免許・技能講習・特別教育/,
    source: [/安衛法第61条/, /安衛令第20条/],
    sourceLocator: {
      law: /安衛令|労働安全衛生法施行令/,
      article: /第20条/,
      item: "第10号・第12号・第15号",
      snippet:
        /第10号[\s\S]*可燃性ガス[\s\S]*第12号[\s\S]*三トン以上[\s\S]*第15号[\s\S]*十メートル以上/,
    },
    additionalSourceLocators: [
      {
        law: /安衛法|労働安全衛生法/,
        article: /第61条/,
        paragraph: "第1項",
        snippet: /技能講習を修了した者[\s\S]*業務に就かせてはならない/,
      },
    ],
    poison: /酸欠則|石綿則|有機則|電気工事士法/,
  },
  {
    id: "full-harness-natural",
    question: "フルハーネスの資格は？",
    answer: /一律の国家資格免状.*ありません[\s\S]*特別教育が必要/,
    condition: /高さ2m以上|ロープ高所作業/,
    source: [/安衛法第59条/, /安衛則第36条/],
    poison: /酸欠則|石綿則|有機則|電気工事士法/,
  },
] as const;

describe("自然文変種をactual JSON/SSE経路でanswer-firstに処理する", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of NATURAL_VARIANTS) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const response = await callRouteMode(testCase.question, mode);
      const substance = `${response.directAnswer} ${response.importantConditions.join(" ")}`;
      expect(response.directAnswer, testCase.id).toMatch(testCase.answer);
      expect(substance, testCase.id).toMatch(testCase.condition);
      expect(isPureClarificationResponse(response), testCase.id).toBe(false);
      const sourceUnits = response.sources
        .map((source) => `${source.lawShort ?? source.law}${source.article}`)
        .join(" ");
      for (const authority of testCase.source) {
        expect(sourceUnits, `${testCase.id}: missing official source`).toMatch(
          authority,
        );
      }
      expect(sourceUnits, `${testCase.id}: poison source`).not.toMatch(
        testCase.poison,
      );
      if ("clarification" in testCase) {
        expect(response.clarificationQuestion, testCase.id).toMatch(
          testCase.clarification,
        );
      }
      if ("clarificationForbidden" in testCase) {
        expect(response.clarificationQuestion, testCase.id).not.toMatch(
          testCase.clarificationForbidden,
        );
      }
      if ("sourceLocator" in testCase) {
        const locatedSource = response.sources.find(
          (source) =>
            testCase.sourceLocator.law.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && testCase.sourceLocator.article.test(source.article),
        );
        if ("paragraph" in testCase.sourceLocator) {
          expect(locatedSource?.paragraph, testCase.id).toBe(
            testCase.sourceLocator.paragraph,
          );
        }
        if ("item" in testCase.sourceLocator) {
          expect(
            locatedSource?.item,
            `${testCase.id}: ${JSON.stringify(locatedSource)}`,
          ).toBe(testCase.sourceLocator.item);
        }
        expect(locatedSource?.snippet, testCase.id).toMatch(
          testCase.sourceLocator.snippet,
        );
      }
      if ("additionalSourceLocators" in testCase) {
        for (const locator of testCase.additionalSourceLocators) {
          const locatedSource = response.sources.find(
            (source) =>
              locator.law.test(`${source.lawShort ?? ""} ${source.law}`) &&
              locator.article.test(source.article),
          );
          expect(locatedSource?.paragraph, testCase.id).toBe(locator.paragraph);
          if ("item" in locator) {
            expect(locatedSource?.item, testCase.id).toBe(locator.item);
          }
          expect(locatedSource?.snippet, testCase.id).toMatch(locator.snippet);
        }
      }
    }
  });
});

const DOMAIN_FIRST_NATURAL_VARIANTS = [
  {
    id: "forklift-colloquial",
    question: "フォークリフト乗るのに何がいる？",
    answer: /1トン未満.*特別教育.*1トン以上.*技能講習/,
    condition: /構造・材料.*最大の荷重/,
    sources: [/安衛則第36条/, /安衛令第20条/],
    allowedFollowup: /最大荷重|1トン未満|1トン以上|分からない/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "forklift-short-name",
    question: "フォーク使うには何が必要？",
    answer: /1トン未満.*特別教育.*1トン以上.*技能講習/,
    condition: /構造・材料.*最大の荷重/,
    sources: [/安衛則第36条/, /安衛令第20条/],
    allowedFollowup: /最大荷重|1トン未満|1トン以上|分からない/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "scaffold-colloquial",
    question: "足場を組み立てるには？",
    answer: /組立て・解体・変更.*作業者.*特別教育/,
    condition: /高さ5m以上.*作業主任者.*技能講習/,
    sources: [/安衛則第36条/, /安衛令第6条/],
    allowedFollowup: /作業者|特別教育|作業主任者|組立て/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "harness-colloquial",
    question: "ハーネス付けて作業するには？",
    answer: /一律の国家資格免状.*ありません.*特別教育が必要/,
    condition: /高さ2m以上|作業床を設けることが困難/,
    sources: [/安衛法第59条/, /安衛則第36条/],
    allowedFollowup: /作業床|条件不明/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "oxygen-description",
    question: "酸素が少ない場所で作業するには？",
    answer: /特別教育.*作業主任者/,
    condition: /作業開始前.*測定.*換気.*常時監視/,
    sources: [/安衛則第36条/, /酸欠則第11条/, /酸欠則第12条/],
    allowedFollowup: /タンク|ピット|マンホール|坑内|作業場所|第一種|第二種/,
    poison: /有機則|石綿則|電気工事士法/,
  },
  {
    id: "solvent-painting",
    question: "溶剤で塗装するには？",
    answer: /まず確認する資格は作業主任者.*作業者全員.*ではありません/,
    condition: /SDS.*局所排気.*臨時・短時間/,
    sources: [/有機則第19条/, /有機則第5条/],
    allowedFollowup: /作業者|作業主任者|設備|換気|第1種|第2種|第3種/,
    poison: /酸欠則|石綿則|電気工事士法/,
  },
  {
    id: "thinner-colloquial",
    question: "シンナー扱うのに何がいる？",
    answer: /まず確認する資格は作業主任者.*作業者全員.*ではありません/,
    condition: /SDS.*局所排気.*臨時・短時間/,
    sources: [/有機則第19条/, /有機則第5条/],
    allowedFollowup: /作業者|作業主任者|設備|換気|第1種|第2種|第3種/,
    poison: /酸欠則|石綿則|電気工事士法/,
  },
  {
    id: "asbestos-colloquial",
    question: "石綿を扱うには？",
    answer: /労働者には特別教育.*石綿作業主任者技能講習/,
    condition: /事前調査者.*置き換わる資格ではありません/,
    sources: [/安衛則第36条/, /石綿則第19条/, /石綿則第3条/],
    allowedFollowup: /作業者|特別教育|作業主任者|事前調査者/,
    poison: /酸欠則|有機則|電気工事士法/,
  },
  {
    id: "overhead-crane-colloquial",
    question: "天井クレーン動かすには？",
    answer: /種類.*つり上げ荷重.*免許.*技能講習.*特別教育/,
    condition: /5トン未満.*特別教育.*5トン以上.*免許/,
    sources: [/安衛令第20条/, /クレーン則第22条/],
    allowedFollowup: /クレーン|つり上げ荷重|5トン|床上操作式/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "mobile-crane-colloquial",
    question: "移動式クレーンを使うには？",
    answer: /種類.*つり上げ荷重.*免許.*技能講習.*特別教育/,
    condition: /5トン以上.*免許.*1トン以上5トン未満.*技能講習.*1トン未満.*特別教育/,
    sources: [/安衛令第20条/, /クレーン則第67条/, /クレーン則第68条/],
    allowedFollowup: /つり上げ荷重|1トン未満|1〜5トン未満|5トン以上/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "heat-colloquial",
    question: "暑い現場で何をすべき？",
    answer: /WBGT.*休止・休憩.*暑熱順化.*水分・塩分.*報告させる体制/,
    condition: /作業からの離脱.*身体の冷却.*受診/,
    sources: [/安衛則第612条の2/, /熱中症ガイドライン第2・第3/],
    allowedFollowup: /WBGT|報告|連絡|手順|体制|対象作業/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "heat-short-colloquial",
    question: "暑さ対策は？",
    answer: /WBGT.*休止・休憩.*暑熱順化.*水分・塩分.*報告させる体制/,
    condition: /作業からの離脱.*身体の冷却.*受診/,
    sources: [/安衛則第612条の2/, /熱中症ガイドライン第2・第3/],
    allowedFollowup: /WBGT|報告|連絡|手順|体制|対象作業/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "chemical-manager-qualification",
    question: "化学物質管理者になる資格は？",
    answer: /RA対象物.*事業場ごと.*14日以内/,
    condition: /製造事業場.*講習.*取扱事業場.*必要な能力/,
    sources: [/安衛則第12条の5/],
    allowedFollowup: /RA対象物|製造|取り扱う|譲渡・提供|選任要件/,
    poison: /(?:^|\s)(?:運転|玉掛け)(?:\s|$)|酸欠則|石綿則|電気工事士法/,
  },
  {
    id: "chemical-manager-ra-colloquial",
    question: "RA対象物を扱う時の管理者は？",
    answer: /RA対象物.*事業場ごと.*14日以内/,
    condition: /製造事業場.*講習.*取扱事業場.*必要な能力/,
    sources: [/安衛則第12条の5/],
    allowedFollowup: /RA対象物|製造|取り扱う|譲渡・提供|選任要件/,
    poison: /(?:^|\s)(?:運転|玉掛け)(?:\s|$)|酸欠則|石綿則|電気工事士法/,
  },
  {
    id: "work-supervisor-colloquial",
    question: "主任者を置く仕事は？",
    answer: /全作業に共通する資格ではなく.*足場.*酸素欠乏.*有機溶剤.*石綿/,
    condition: /免許・技能講習.*作業ごとに異なる/,
    sources: [/安衛法第14条/, /安衛令第6条/],
    allowedFollowup: /作業主任者|作業名|物質|設備/,
    poison: /電気工事士法|クレーン則/,
  },
  {
    id: "skill-training-colloquial",
    question: "技能講習ってどんなの？",
    answer: /就業制限業務.*高所作業車.*車両系建設機械.*溶接・溶断/,
    condition: /免許・技能講習・特別教育/,
    sources: [/安衛法第61条/, /安衛令第20条/],
    allowedFollowup: /作業名|設備|技能講習/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "skill-training-work-colloquial",
    question: "技能講習を受ける仕事は？",
    answer: /就業制限業務.*高所作業車.*車両系建設機械.*溶接・溶断/,
    condition: /免許・技能講習・特別教育/,
    sources: [/安衛法第61条/, /安衛令第20条/],
    allowedFollowup: /作業名|設備|技能講習/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "summer-site-safety",
    question: "夏の現場の安全対策は？",
    answer: /WBGT.*休止・休憩.*暑熱順化.*水分・塩分.*報告させる体制/,
    condition: /作業からの離脱.*身体の冷却.*受診/,
    sources: [/安衛則第612条の2/, /熱中症ガイドライン第2・第3/],
    allowedFollowup: /WBGT|報告|連絡|手順|体制|対象作業/,
    poison: /安衛則第640条|男女雇用機会均等法|酸欠則|有機則|石綿則/,
  },
  {
    id: "hot-site-safety",
    question: "熱い現場の対策は？",
    answer: /WBGT.*休止・休憩.*暑熱順化.*水分・塩分.*報告させる体制/,
    condition: /作業からの離脱.*身体の冷却.*受診/,
    sources: [/安衛則第612条の2/, /熱中症ガイドライン第2・第3/],
    allowedFollowup: /WBGT|報告|連絡|手順|体制|対象作業/,
    poison: /男女雇用機会均等法|酸欠則|有機則|石綿則/,
  },
  {
    id: "slinging-education-natural",
    question: "荷を吊る時に受ける教育は？",
    answer: /玉掛け.*1トン未満.*特別教育.*1トン以上.*玉掛け技能講習/,
    condition: /実際の荷.*つり上げ荷重|つり荷重量.*つり上げ荷重/,
    sources: [/安衛令第20条/, /クレーン則第221条/, /クレーン則第222条/],
    allowedFollowup: /つり上げ荷重|1トン未満|1トン以上|分からない/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "slinging-wire-natural",
    question: "荷物をワイヤーで吊る準備するには？",
    answer: /玉掛け.*1トン未満.*特別教育.*1トン以上.*玉掛け技能講習/,
    condition: /実際の荷.*つり上げ荷重|つり荷重量.*つり上げ荷重/,
    sources: [/安衛令第20条/, /クレーン則第221条/, /クレーン則第222条/],
    allowedFollowup: /つり上げ荷重|1トン未満|1トン以上|分からない/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "slinging-action-natural",
    question: "玉掛けするには？",
    answer: /玉掛け.*1トン未満.*特別教育.*1トン以上.*玉掛け技能講習/,
    condition: /実際の荷.*つり上げ荷重|つり荷重量.*つり上げ荷重/,
    sources: [/安衛令第20条/, /クレーン則第221条/, /クレーン則第222条/],
    allowedFollowup: /つり上げ荷重|1トン未満|1トン以上|分からない/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "tank-entry-natural",
    question: "タンクに入る時に必要なことは？",
    answer:
      /タンク内.*一つの資格.*酸素欠乏危険場所.*作業開始前.*測定.*換気.*常時監視.*特別教育.*作業主任者/,
    condition: /有機溶剤.*局所排気.*有機溶剤作業主任者/,
    sources: [/酸欠則第3条/, /酸欠則第5条/, /酸欠則第11条/, /酸欠則第12条/, /有機則第5条/, /有機則第19条/],
    allowedFollowup: /タンク|内容物|残留物|有機溶剤|シンナー|化学物質|不明/,
    poison: /有機則第26条|安衛則第640条|石綿則|電気工事士法/,
  },
  {
    id: "oxygen-entry-natural",
    question: "酸欠場所に入るには？",
    answer: /特別教育.*作業主任者/,
    condition: /作業開始前.*測定.*換気.*常時監視/,
    sources: [/安衛則第36条/, /酸欠則第11条/, /酸欠則第12条/],
    allowedFollowup: /タンク|ピット|マンホール|坑内|作業場所|第一種|第二種/,
    poison: /有機則|石綿則|電気工事士法/,
  },
  {
    id: "aerial-work-platform-description",
    question: "作業車で高い所に上がるには？",
    answer: /高所作業車.*作業床最高高さ.*10m未満.*特別教育.*10m以上.*技能講習/,
    condition: /10mちょうど.*技能講習/,
    sources: [/安衛則第36条/, /安衛令第20条/],
    allowedFollowup: /作業床|2m未満|2m以上10m未満|10m以上/,
    poison: /安衛則第194条の14|酸欠則|有機則|石綿則/,
  },
  {
    id: "dangerous-work-education",
    question: "危険作業の教育を教えて",
    answer: /特別教育.*危険・有害.*研削といし.*高所作業車.*足場.*フルハーネス/,
    condition: /技能講習や免許側へ変わる/,
    sources: [/安衛法第59条/, /安衛則第36条/],
    allowedFollowup: /高所作業車|低圧電気|研削といし|作業/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "high-place-harness",
    question: "高い所でフルハーネス使う",
    answer: /高さ2m以上.*作業床を設けることが困難.*特別教育が必要/,
    condition: /ロープ高所作業|作業床を設けることが困難/,
    sources: [/安衛法第59条/, /安衛則第36条/],
    allowedFollowup: /作業床|条件不明/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "asbestos-work-natural",
    question: "アスベスト工事するには？",
    answer: /労働者には特別教育.*石綿作業主任者技能講習/,
    condition: /事前調査者.*置き換わる資格ではありません/,
    sources: [/安衛則第36条/, /石綿則第19条/, /石綿則第3条/],
    allowedFollowup: /作業者|特別教育|作業主任者|事前調査者/,
    poison: /酸欠則|有機則|電気工事士法/,
  },
  {
    id: "chemical-manager-action-natural",
    question: "化学物質を扱う管理者は？",
    answer: /RA対象物.*事業場ごと.*14日以内/,
    condition: /製造事業場.*講習.*取扱事業場.*必要な能力/,
    sources: [/安衛則第12条の5/],
    allowedFollowup: /RA対象物|製造|取り扱う|譲渡・提供|選任要件/,
    poison: /安衛則第34条の4|CAS|酸欠則|石綿則|電気工事士法/,
  },
  {
    id: "chemical-manager-consumer-product-only",
    question:
      "一般消費者向けの市販洗剤だけを扱う事業場に化学物質管理者は必要？",
    answer: /一般消費者の生活の用.*製品だけ.*選任対象外.*選任は不要/,
    condition: /市販品.*だけでは.*除外を確定できません.*製品表示.*想定用途/,
    sources: [/安衛則第12条の5/],
    allowedFollowup: /一般消費者|製品表示|想定用途|業務用|RA対象物/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
  {
    id: "chemical-manager-centralized-sales-sites",
    question:
      "RA対象物の表示と教育管理を本社でまとめ、販売拠点は譲渡・提供だけです。各拠点に化学物質管理者は必要？",
    answer: /譲渡または提供だけ.*事業場ごと.*選任対象/,
    condition: /各販売拠点の選任は必要.*他事業場で選任した化学物質管理者.*管理/,
    sources: [/安衛則第12条の5/],
    allowedFollowup: /譲渡・提供|表示|教育管理|本社|事業場/,
    poison: /酸欠則|有機則|石綿則|電気工事士法/,
  },
] as const;

describe("domain/entity を先に認識し、口語の要件質問を単条文表示へ落とさない", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of DOMAIN_FIRST_NATURAL_VARIANTS) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const response = await callRouteMode(testCase.question, mode);
      const substance = normalized(
        `${response.directAnswer} ${response.importantConditions.join(" ")}`,
      );
      expect(response.directAnswer, testCase.id).toMatch(testCase.answer);
      expect(substance, testCase.id).toMatch(testCase.condition);
      expect(isPureClarificationResponse(response), testCase.id).toBe(false);
      expect(response.quickReplies.length, testCase.id).toBeLessThanOrEqual(3);
      expect(
        (response.answer.match(/[？?]/g) ?? []).length,
        testCase.id,
      ).toBeLessThanOrEqual(1);

      const sourceUnits = response.sources
        .map((source) => `${source.lawShort ?? source.law}${source.article}`)
        .join(" ");
      for (const source of testCase.sources) {
        expect(sourceUnits, `${testCase.id}: missing official source`).toMatch(
          source,
        );
      }
      expect(sourceUnits, `${testCase.id}: poison source`).not.toMatch(
        testCase.poison,
      );

      const followupText = normalized(
        [
          response.clarificationQuestion ?? "",
          ...response.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
        ].join(" "),
      );
      if (followupText) {
        expect(
          followupText,
          `${testCase.id}: unrelated clarification or quick reply`,
        ).toMatch(testCase.allowedFollowup);
        expect(followupText, `${testCase.id}: generic taxonomy`).not.toMatch(
          /資格・教育を確認したい作業|^運転$|玉掛け.*作業主任者/,
        );
        if (response.clarificationQuestion) {
          expect(
            normalized(response.clarificationQuestion),
            `${testCase.id}: unrelated clarification`,
          ).toMatch(testCase.allowedFollowup);
        }
        for (const reply of response.quickReplies) {
          expect(
            normalized(`${reply.label} ${reply.prompt}`),
            `${testCase.id}: unrelated quick reply ${reply.label}`,
          ).toMatch(testCase.allowedFollowup);
        }
      }
    }
  }, 60_000);
});

describe("化学物質管理者の対象外と他事業場管理を12条の5の該当項へ結ぶ", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of [
      {
        question:
          "一般消費者向けの市販洗剤だけを扱う事業場に化学物質管理者は必要？",
        paragraph: "第1項",
        snippet:
          /主として一般消費者の生活の用に供される製品に係るものを除く.*化学物質管理者を選任/,
        answer: /選任対象外.*選任は不要/,
      },
      {
        question:
          "RA対象物の表示と教育管理を本社でまとめ、販売拠点は譲渡・提供だけです。各拠点に化学物質管理者は必要？",
        paragraph: "第2項・第3項",
        snippet:
          /譲渡又は提供を行う事業場[\s\S]*ごとに、化学物質管理者を選任[\s\S]*他の事業場において選任した化学物質管理者に管理させなければならない[\s\S]*事由が発生した日から十四日以内/,
        answer: /譲渡または提供だけ.*14日以内/,
      },
    ] as const) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const response = await callRouteMode(testCase.question, mode);
      const source = response.sources.find(
        (candidate) =>
          candidate.lawShort === "安衛則" &&
          candidate.article.startsWith("第12条の5"),
      );

      expect(
        normalized(
          `${response.directAnswer} ${response.importantConditions.join(" ")}`,
        ),
      ).toMatch(testCase.answer);
      expect(source?.paragraph).toBe(testCase.paragraph);
      expect(source?.snippet).toMatch(testCase.snippet);
      expect(response.clarificationQuestion ?? "").not.toMatch(
        /RA対象物を製造する事業場ですか/,
      );
    }
  });
});

describe("能力閾値と教育対象号をactual sourceの該当号本文まで表示する", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    const cases = [
      {
        id: "fixed-crane-five-ton",
        question: "クレーンを運転する資格は？",
        law: /安衛令|労働安全衛生法施行令/,
        article: /第20条/,
        item: "第6号",
        snippet: /第6号[\s\S]*五トン以上のクレーン/,
        snippetPoison: /第7号|移動式クレーン/,
      },
      {
        id: "sling-one-ton",
        question: "玉掛けの資格は？",
        law: /安衛令|労働安全衛生法施行令/,
        article: /第20条/,
        item: "第16号",
        snippet: /第16号[\s\S]*つり上げ荷重が一トン以上[\s\S]*玉掛け/,
      },
      {
        id: "full-harness-item-41",
        question: "フルハーネスの教育は？",
        law: /安衛則|労働安全衛生規則/,
        article: /第36条/,
        item: "第41号",
        snippet:
          /第41号[\s\S]*高さが二メートル以上[\s\S]*作業床を設けることが困難[\s\S]*フルハーネス型/,
        snippetPoison: /第40号/,
      },
    ] as const;

    for (const testCase of cases) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const response = await callRouteMode(testCase.question, mode);
      const source = response.sources.find(
        (candidate) =>
          testCase.law.test(`${candidate.lawShort ?? ""} ${candidate.law}`) &&
          testCase.article.test(candidate.article),
      );
      expect(source?.item, testCase.id).toBe(testCase.item);
      expect(source?.snippet, testCase.id).toMatch(testCase.snippet);
      if ("snippetPoison" in testCase) {
        expect(source?.snippet, testCase.id).not.toMatch(testCase.snippetPoison);
      }
      if (testCase.id === "fixed-crane-five-ton") {
        const educationDuty = response.sources.find(
          (candidate) =>
            /安衛法|労働安全衛生法/.test(
              `${candidate.lawShort ?? ""} ${candidate.law}`,
            ) && /第59条/.test(candidate.article),
        );
        expect(educationDuty?.paragraph, testCase.id).toBe("第3項");
        expect(educationDuty?.snippet, testCase.id).toMatch(
          /危険又は有害な業務[\s\S]*特別の教育/,
        );
      }
    }
  }, 30_000);
});

describe("生成quick replyを次turnで消費し、同じ分類質問へ戻らない", () => {
  const cases = [
    {
      id: "harness-floor",
      question: "フルハーネスの資格は？",
      choice: /^作業床あり$/,
      answer: /作業床を設けられる場合.*36条41号.*対象にはなりません/,
      context: (response: ChatbotResponse) =>
        response.context?.confirmedChoices?.includes("作業床あり") === true,
      poison: /資格・教育を確認したい作業|^運転$|玉掛け/,
    },
    {
      id: "fixed-crane",
      question: "クレーン運転の資格は？",
      choice: /^クレーン$/,
      answer: /移動式でないクレーン.*5トン未満.*特別教育.*5トン以上.*免許.*床上操作式.*技能講習/,
      context: (response: ChatbotResponse) =>
        response.context?.confirmedChoices?.includes("クレーン") === true,
      poison: /酸欠|有機溶剤|石綿|電気工事士/,
    },
    {
      id: "scaffold-worker",
      question: "足場の資格は？",
      choice: /^作業者の特別教育$/,
      answer: /作業者として従事.*地上.*補助作業を除き.*特別教育が必要/,
      context: (response: ChatbotResponse) =>
        response.context?.roleType === "worker" &&
        response.context?.qualificationType === "special-education",
      poison: /酸欠|有機溶剤|石綿|玉掛け/,
    },
    {
      id: "organic-worker",
      question: "有機溶剤の資格は？",
      choice: /^作業者の教育$/,
      answer: /作業者全員.*作業主任者技能講習.*制度ではありません.*安衛則36条/,
      context: (response: ChatbotResponse) =>
        response.context?.roleType === "worker",
      poison: /酸欠|石綿|玉掛け|電気工事士/,
    },
    {
      id: "asbestos-worker",
      question: "石綿の資格は？",
      choice: /^作業者の特別教育$/,
      answer: /石綿使用建築物等解体等作業.*労働者.*石綿則27条.*特別教育が必要/,
      context: (response: ChatbotResponse) =>
        response.context?.roleType === "worker" &&
        response.context?.qualificationType === "special-education",
      poison: /酸欠|有機溶剤|玉掛け|電気工事士/,
    },
    {
      id: "chemical-manufacture",
      question: "化学物質管理者になる資格は？",
      choice: /^RA対象物を製造$/,
      answer: /製造する事業場.*14日以内.*講習.*同等以上の能力/,
      context: (response: ChatbotResponse) =>
        response.context?.confirmedChoices?.includes("RA対象物を製造") === true,
      poison: /酸欠|石綿|玉掛け|フォークリフト/,
    },
  ] as const;

  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of cases) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const first = await callRouteMode(testCase.question, mode);
      const selected = first.quickReplies.find((reply) =>
        testCase.choice.test(reply.label),
      );
      expect(selected, `${testCase.id}: generated choice`).toBeDefined();

      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(
        selected!.prompt,
        mode,
        first.context,
      );
      const substance = answerText(second);
      expect(substance, `${testCase.id}: selected branch answer`).toMatch(
        testCase.answer,
      );
      expect(testCase.context(second), `${testCase.id}: context consumed`).toBe(
        true,
      );
      expect(isPureClarificationResponse(second), testCase.id).toBe(false);
      expect(second.clarificationQuestion, testCase.id).not.toBe(
        first.clarificationQuestion,
      );
      expect(
        second.quickReplies.some((reply) =>
          testCase.choice.test(reply.label),
        ),
        `${testCase.id}: same chip repeated`,
      ).toBe(false);
      const followups = normalized(
        [
          second.clarificationQuestion ?? "",
          ...second.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
        ].join(" "),
      );
      expect(followups, `${testCase.id}: generic/domain jump`).not.toMatch(
        testCase.poison,
      );
      expect(second.sources.length, `${testCase.id}: official evidence`).toBeGreaterThan(0);
      expect(second.citations.length, `${testCase.id}: citations`).toBeGreaterThan(0);
      if (testCase.id === "asbestos-worker") {
        const workerScope = second.sources.find(
          (source) =>
            /石綿則|石綿障害予防規則/.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && /第4条/.test(source.article),
        );
        const workerEducation = second.sources.find(
          (source) =>
            /石綿則|石綿障害予防規則/.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && /第27条/.test(source.article),
        );
        expect(workerScope?.paragraph, testCase.id).toBe("第1項");
        expect(workerScope?.snippet, testCase.id).toMatch(
          /石綿使用建築物等解体等作業/,
        );
        expect(workerEducation?.paragraph, testCase.id).toBe("第1項");
        expect(workerEducation?.snippet, testCase.id).toMatch(
          /石綿使用建築物等解体等作業に係る業務[\s\S]*特別の教育/,
        );
      }
    }
  }, 60_000);
});

describe("main14の生成quick replyをactual次turnで消費する", () => {
  const allowedPublicContextKeys = new Set([
    "topicDomain",
    "workAction",
    "equipment",
    "voltageClass",
    "energizedState",
    "roleType",
    "qualificationType",
    "workDate",
    "confirmedChoices",
  ]);

  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of CASES) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const first = await callRouteMode(testCase.question, mode);

      for (const selected of first.quickReplies) {
        __resetChatbotCacheForTests();
        __resetRateLimitForTests();
        const second = await callRouteMode(
          selected.prompt,
          mode,
          first.context,
        );
        const id = `${testCase.id}:${selected.label}`;
        const explicitUnknownChoice = /(?:分からない|わからない|不明)/.test(
          `${selected.label} ${selected.prompt}`,
        );
        const visible = normalized(
          [
            second.directAnswer,
            ...second.importantConditions,
            second.clarificationQuestion ?? "",
            ...second.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
          ].join(" "),
        );

        expect(second.safetyKind, `${id}: privacy false positive`).not.toBe(
          "privacy",
        );
        expect(second.safetyKind, `${id}: ambiguity safety fallback`).not.toBe(
          "ambiguous",
        );
        expect(second.source_type, `${id}: unexpected safety fallback`).not.toBe(
          "safety",
        );
        expect(second.directAnswer.trim(), `${id}: empty direct answer`).not.toBe(
          "",
        );
        expect(normalized(second.directAnswer), `${id}: generic-only`).not.toMatch(
          GENERIC_ONLY,
        );
        expect(isPureClarificationResponse(second), `${id}: pure clarification`).toBe(
          false,
        );
        const selectedText = answerText(second);
        const selectedBranchMeaningByChoice = (() => {
          if (testCase.id === "forklift") {
            if (selected.label === "1トン未満") {
              return /最大荷重1トン未満.*特別教育/.test(selectedText);
            }
            if (selected.label === "1トン以上") {
              return /最大荷重1トン以上.*技能講習/.test(selectedText);
            }
            if (explicitUnknownChoice) {
              return (
                /最大荷重1トン未満.*特別教育/.test(selectedText) &&
                /最大荷重1トン以上.*技能講習/.test(selectedText) &&
                /(?:車体)?銘板|仕様書/.test(
                  `${selectedText} ${second.clarificationQuestion ?? ""}`,
                )
              );
            }
          }
          if (testCase.id === "slinging") {
            if (selected.label === "1トン未満") {
              return /つり上げ荷重1トン未満.*特別教育/.test(selectedText);
            }
            if (selected.label === "1トン以上") {
              return /つり上げ荷重1トン以上.*玉掛け技能講習/.test(
                selectedText,
              );
            }
            if (explicitUnknownChoice) {
              return (
                /つり上げ荷重/.test(selectedText) &&
                /1トン未満.*特別教育/.test(selectedText) &&
                /1トン以上.*玉掛け技能講習/.test(selectedText) &&
                /銘板|仕様書/.test(
                  `${selectedText} ${second.clarificationQuestion ?? ""}`,
                )
              );
            }
          }
          if (testCase.id === "scaffold") {
            if (selected.label === "作業者の特別教育") {
              return [/作業者/, /(?:組立|解体|変更)/, /特別教育/].every(
                (pattern) => pattern.test(selectedText),
              );
            }
            if (selected.label === "足場の作業主任者") {
              return /(?:つり足場|張出し足場|5m).*作業主任者.*技能講習/.test(
                selectedText,
              );
            }
          }
          if (testCase.id === "full-harness") {
            if (selected.label === "作業床あり") {
              return /作業床を設けられる.*36条41号.*対象にはなりません/.test(
                selectedText,
              );
            }
            if (selected.label === "作業床なし") {
              return /作業床を設けることが困難.*高さ2m以上.*フルハーネス.*特別教育が必要/.test(
                selectedText,
              );
            }
          }
          if (testCase.id === "aerial-work-platform") {
            if (selected.label === "2m未満") {
              return /作業床最高高さ.*2m未満.*高所作業車.*対象外/.test(
                selectedText,
              );
            }
            if (selected.label === "2m以上10m未満") {
              return /作業床最高高さ.*2m以上10m未満.*特別教育/.test(
                selectedText,
              );
            }
            if (selected.label === "10m以上") {
              return /作業床最高高さ.*10m以上.*技能講習/.test(selectedText);
            }
          }
          if (testCase.id === "organic-solvent") {
            if (selected.label === "第1種" || selected.label === "第2種") {
              return new RegExp(
                `${selected.label}有機溶剤.*屋内作業場.*密閉.*局所排気.*プッシュプル`,
              ).test(selectedText);
            }
            if (selected.label === "第3種") {
              return /第3種有機溶剤.*タンク.*(?:全体換気|局所排気)/.test(
                selectedText,
              );
            }
          }
          if (testCase.id === "asbestos") {
            if (selected.label === "建築物") {
              return /建築物.*事前調査.*(?:一般|特定)建築物石綿含有建材調査者.*令和5年10月1日/.test(
                selectedText,
              );
            }
            if (selected.label === "工作物") {
              return /工作物.*工作物石綿事前調査者.*令和8年1月1日/.test(
                selectedText,
              );
            }
            if (selected.label === "船舶") {
              return /鋼製の船舶.*船舶石綿含有資材調査者.*令和5年10月1日/.test(
                selectedText,
              );
            }
          }
          if (testCase.id === "chemical-manager") {
            if (selected.label === "RA対象物を製造") {
              return /RA対象物を製造する事業場.*14日以内.*講習.*同等以上の能力/.test(
                selectedText,
              );
            }
            if (selected.label === "RA対象物を取り扱う") {
              return /製造せず取り扱う事業場.*14日以内.*必要な能力/.test(
                selectedText,
              );
            }
            if (selected.label === "譲渡・提供のみ") {
              return /譲渡または提供だけ.*選任対象.*14日以内/.test(
                selectedText,
              );
            }
          }
          if (testCase.id === "crane") {
            if (selected.label === "クレーン") {
              return /移動式でないクレーン.*5トン未満.*特別教育.*5トン以上.*免許.*床上操作式.*技能講習/.test(
                selectedText,
              );
            }
            if (selected.label === "移動式クレーン") {
              return /移動式クレーン.*5トン以上.*免許.*1トン以上5トン未満.*技能講習.*1トン未満.*特別教育/.test(
                selectedText,
              );
            }
            if (selected.label === "デリック") {
              return /デリック.*5トン未満.*特別教育.*5トン以上.*免許/.test(
                selectedText,
              );
            }
          }
          if (testCase.id === "special-education") {
            if (selected.label === "研削といし") {
              return /研削といし.*(?:取替え|試運転).*特別教育/.test(
                selectedText,
              );
            }
            if (selected.label === "高所作業車") {
              return /高所作業車.*10m未満.*特別教育.*10m以上.*技能講習/.test(
                selectedText,
              );
            }
            if (selected.label === "低圧電気") {
              return (
                /低圧.*特別教育対象.*充電電路.*敷設・修理.*露出充電部付き開閉器.*操作/.test(
                  selectedText,
                ) &&
                /全ての.*(?:目視|点検|測定).*一律対象.*(?:ではありません|ではない)/.test(
                  selectedText,
                ) &&
                second.context?.topicDomain === "electrical" &&
                second.context?.voltageClass === "低圧" &&
                second.context?.qualificationType === "special-education"
              );
            }
          }
          return undefined;
        })();
        const selectedBranchHasDomainMeaning =
          selectedBranchMeaningByChoice ??
          testCase.rules.every((rule) => rule.test(selectedText, second));
        expect(
          selectedBranchHasDomainMeaning,
          `${id}: selected branch lacks case-specific meaning context=${JSON.stringify(second.context)} clarification=${second.clarificationQuestion ?? "null"}\n${answerText(second)}`,
        ).toBe(true);
        expect(second.sources.length, `${id}: official sources`).toBeGreaterThan(0);
        expect(second.citations.length, `${id}: citations`).toBeGreaterThan(0);
        expect(second.effectiveDateStatus, `${id}: effective date`).toMatchObject({
          status: "current",
          asOf: "2026-08-09",
        });
        expect(second.clarificationQuestion, `${id}: same question repeated`).not.toBe(
          first.clarificationQuestion,
        );
        expect(
          second.quickReplies.some(
            (reply) =>
              reply.label === selected.label || reply.prompt === selected.prompt,
          ),
          `${id}: selected chip repeated`,
        ).toBe(false);
        expect(visible, `${id}: generic taxonomy`).not.toMatch(
          /資格・教育を確認したい作業|^運転$|玉掛け.*作業主任者/,
        );
        expect(visible, `${id}: unrelated domain jump`).not.toMatch(
          testCase.forbiddenJump,
        );
        if (first.context?.topicDomain) {
          expect(second.context?.topicDomain, `${id}: topic context lost`).toBe(
            first.context.topicDomain,
          );
        }
        expect(
          Object.keys(second.context ?? {}).every((key) =>
            allowedPublicContextKeys.has(key),
          ),
          `${id}: unsafe public context key`,
        ).toBe(true);
      }
    }
  }, 120_000);
});

describe("安全な業務quick replyをprivacy遮断せずJSON/SSEで往復する", () => {
  const generatedCases = [
    {
      initial: "電気作業の資格は？",
      prompt: "配線・充電部を扱う",
    },
    {
      initial: "電気作業の特別教育について教えて",
      prompt: "盤内測定・配線",
    },
    { initial: "有機溶剤の資格は？", prompt: "換気・保護措置" },
    {
      initial: "化学物質管理者になる資格は？",
      prompt: "譲渡・提供のみ",
    },
    {
      initial: "タンクに入る時に必要なことは？",
      prompt: "有機溶剤・シンナー",
    },
  ] as const;

  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of generatedCases) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const first = await callRouteMode(testCase.initial, mode);
      expect(
        first.quickReplies.some(
          (reply) =>
            reply.label === testCase.prompt && reply.prompt === testCase.prompt,
        ),
        `${testCase.prompt}: generated exact chip`,
      ).toBe(true);

      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(
        testCase.prompt,
        mode,
        first.context,
      );
      expect(second.source_type, testCase.prompt).not.toBe("safety");
      expect(second.directAnswer, testCase.prompt).not.toMatch(
        /個人情報|氏名|社員番号.*入力しない/,
      );
      expect(isPureClarificationResponse(second), testCase.prompt).toBe(false);
      expect(second.sources.length, testCase.prompt).toBeGreaterThan(0);
    }

    for (const prompt of [
      "高圧・特別高圧",
      "低圧・高圧",
      "低圧・高圧・特別高圧",
    ]) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const response = await callRouteMode(prompt, mode, {
        topicDomain: "electrical",
        equipment: "電気設備",
        qualificationType: "special-education",
      });
      expect(response.source_type, prompt).not.toBe("safety");
      expect(response.directAnswer, prompt).not.toMatch(/個人情報|氏名|社員番号/);
      expect(response.sources.length, prompt).toBeGreaterThan(0);
    }
  }, 60_000);
});

describe("電気の複合quick replyは未提示の活線・測定行為を発明しない", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    for (const testCase of [
      {
        initial: "電気作業の資格は？",
        prompt: "配線・充電部を扱う",
        answer: /活線作業とは確定しません.*配線の接続・取り外し.*接触・近接.*停電/,
        clarification: /停電して配線.*充電部に触れる.*近く/,
      },
      {
        initial: "電気作業の特別教育について教えて",
        prompt: "盤内測定・配線",
        answer: /別の行為.*テスター測定.*配線の接続・取り外し.*電気工事/,
        clarification: /テスター測定だけ.*配線の接続・取り外し/,
      },
    ] as const) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const first = await callRouteMode(testCase.initial, mode);
      const selected = first.quickReplies.find(
        (reply) => reply.prompt === testCase.prompt,
      );
      expect(selected, `${testCase.prompt}: generated`).toBeDefined();

      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(
        selected!.prompt,
        mode,
        first.context,
      );
      expect(answerText(second), testCase.prompt).toMatch(testCase.answer);
      expect(second.clarificationQuestion, testCase.prompt).toMatch(
        testCase.clarification,
      );
      expect(second.context?.workAction, testCase.prompt).toBe("unknown");
      expect(second.context?.energizedState, testCase.prompt).toBeUndefined();
      expect(second.context?.equipment, testCase.prompt).toBe("電気設備");
      expect(second.directAnswer, testCase.prompt).not.toMatch(
        /充電したまま端子を締める/,
      );
    }
  }, 60_000);
});

describe("クレーン種類chipを能力区分まで二段で消費する", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const first = await callRouteMode("クレーン運転の資格は？", mode);

    const selectFirst = async (label: string) => {
      const selected = first.quickReplies.find((reply) => reply.label === label);
      expect(selected, `${label}: first generated chip`).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      return callRouteMode(selected!.prompt, mode, first.context);
    };

    const mobile = await selectFirst("移動式クレーン");
    expect(answerText(mobile)).toMatch(
      /移動式クレーン.*5トン以上.*移動式クレーン運転士免許.*1トン以上5トン未満.*小型移動式クレーン運転技能講習.*1トン未満.*特別教育/,
    );
    expect(mobile.context?.topicDomain).toBe("lifting");
    expect(mobile.context?.confirmedChoices).toContain("移動式クレーン");
    const mobile67 = mobile.sources.find(
      (source) =>
        /クレーン則|クレーン等安全規則/.test(
          `${source.lawShort ?? ""} ${source.law}`,
        ) && /第67条/.test(source.article),
    );
    const mobile68 = mobile.sources.find(
      (source) =>
        /クレーン則|クレーン等安全規則/.test(
          `${source.lawShort ?? ""} ${source.law}`,
        ) && /第68条/.test(source.article),
    );
    expect(mobile67?.paragraph).toBe("第1項");
    expect(mobile67?.snippet).toMatch(/一トン未満.*特別の教育/);
    expect(mobile68?.paragraph).toBe("第1項");
    expect(mobile68?.snippet).toMatch(
      /移動式クレーン運転士免許.*一トン以上五トン未満.*小型移動式クレーン運転技能講習/,
    );
    const mobileDecree = mobile.sources.find(
      (source) =>
        /安衛令|労働安全衛生法施行令/.test(
          `${source.lawShort ?? ""} ${source.law}`,
        ) && /第20条/.test(source.article),
    );
    expect(mobileDecree?.item).toBe("第7号");
    expect(mobileDecree?.snippet).toMatch(
      /第7号[\s\S]*一トン以上の移動式クレーン/,
    );
    for (const [choice, meaning] of [
      ["1トン未満", /1トン未満.*特別教育/],
      ["1〜5トン未満", /1トン以上5トン未満.*技能講習/],
      ["5トン以上", /5トン以上.*免許/],
    ] as const) {
      const selected = mobile.quickReplies.find((reply) => reply.label === choice);
      expect(
        selected,
        `mobile:${choice} generated=${JSON.stringify(
          mobile.quickReplies.map((reply) => reply.label),
        )} context=${JSON.stringify(mobile.context)} clarification=${mobile.clarificationQuestion}`,
      ).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const third = await callRouteMode(selected!.prompt, mode, mobile.context);
      expect(answerText(third), `mobile:${choice}`).toMatch(meaning);
      expect(third.context?.topicDomain, `mobile:${choice}`).toBe("lifting");
      expect(third.context?.confirmedChoices, `mobile:${choice}`).toContain(
        "移動式クレーン",
      );
    }

    const fixed = await selectFirst("クレーン");
    const fixedFloorRule = fixed.sources.find(
      (source) =>
        /クレーン則|クレーン等安全規則/.test(
          `${source.lawShort ?? ""} ${source.law}`,
        ) && /第22条/.test(source.article),
    );
    expect(fixedFloorRule?.paragraph).toBe("第1項");
    for (const visibleExcerpt of [
      fixedFloorRule?.text,
      fixedFloorRule?.snippet,
    ]) {
      expect(visibleExcerpt).toMatch(
        /床上で運転し[\s\S]*運転をする者が荷の移動とともに移動する方式[\s\S]*床上操作式クレーン運転技能講習を修了した者を当該業務に就かせることができる/,
      );
      expect(visibleExcerpt).not.toMatch(/運転の業務について(?:は)?…?$/);
    }
    for (const [choice, meaning] of [
      ["5トン未満", /5トン未満.*特別教育/],
      ["5トン以上", /5トン以上.*クレーン・デリック運転士免許/],
      ["床上操作式", /床上操作式.*5トン未満.*特別教育.*5トン以上.*技能講習/],
    ] as const) {
      const selected = fixed.quickReplies.find((reply) => reply.label === choice);
      expect(selected, `fixed:${choice}`).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const third = await callRouteMode(selected!.prompt, mode, fixed.context);
      expect(answerText(third), `fixed:${choice}`).toMatch(meaning);
      expect(third.context?.confirmedChoices, `fixed:${choice}`).toContain(
        "クレーン",
      );
      if (choice === "床上操作式") {
        expect(third.context?.confirmedChoices).toContain("床上操作式");
        expect(third.clarificationQuestion).toMatch(/つり上げ荷重/);
        expect(third.quickReplies.map((reply) => reply.label)).toEqual([
          "5トン未満",
          "5トン以上",
        ]);
        const decree = third.sources.find(
          (source) =>
            /安衛令|労働安全衛生法施行令/.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && /第20条/.test(source.article),
        );
        expect(decree?.item).toBe("第6号");
        expect(decree?.snippet).toMatch(/第6号[\s\S]*五トン以上のクレーン/);
        expect(decree?.snippet).not.toMatch(/第7号|移動式クレーン/);
        const floorRule = third.sources.find(
          (source) =>
            /クレーン則|クレーン等安全規則/.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && /第22条/.test(source.article),
        );
        expect(floorRule?.paragraph).toBe("第1項");
        expect(floorRule?.snippet).toMatch(
          /床上で運転し[\s\S]*運転をする者が荷の移動とともに移動する方式[\s\S]*床上操作式クレーン運転技能講習/,
        );
      }
    }

    const derrick = await selectFirst("デリック");
    expect(answerText(derrick)).toMatch(
      /デリック.*5トン未満.*特別教育.*5トン以上.*クレーン・デリック運転士免許/,
    );
    expect(derrick.context?.confirmedChoices).toContain("デリック");
    for (const sourceRule of [
      { article: /第107条/, snippet: /五トン未満のデリ.*特別の教育/ },
      { article: /第108条/, snippet: /クレーン・デリック運転士免許/ },
    ]) {
      const source = derrick.sources.find(
        (candidate) =>
          /クレーン則|クレーン等安全規則/.test(
            `${candidate.lawShort ?? ""} ${candidate.law}`,
          ) && sourceRule.article.test(candidate.article),
      );
      expect(source?.paragraph).toBe("第1項");
      expect(source?.snippet).toMatch(sourceRule.snippet);
    }
    const decree = derrick.sources.find(
      (source) =>
        /安衛令|労働安全衛生法施行令/.test(
          `${source.lawShort ?? ""} ${source.law}`,
        ) && /第20条/.test(source.article),
    );
    expect(decree?.item).toBe("第8号");
    expect(decree?.snippet).toMatch(/第8号.*五トン以上のデリ/);
  }, 90_000);
});

describe("酸欠タンクの換気例外をanswer-firstで適用する", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    const response = await callRouteMode(
      "爆発防止のため換気できない酸欠タンクに入る時に必要なことは？",
      mode,
    );
    const visible = answerText(response);
    expect(response.directAnswer).toMatch(
      /換気できない場合.*換気義務の例外.*無対策で入れるわけではなく.*同時就業者数以上.*空気呼吸器.*酸素呼吸器.*送気マスク/,
    );
    expect(visible).toMatch(
      /作業開始前.*酸素濃度.*常時監視.*特別教育.*作業主任者/,
    );
    expect(response.directAnswer).not.toMatch(/原則として.*換気が必要/);

    const ventilation = response.sources.find(
      (source) =>
        source.lawShort === "酸欠則" &&
        source.article.startsWith("第5条") &&
        !source.article.startsWith("第5条の2"),
    );
    const protection = response.sources.find(
      (source) =>
        source.lawShort === "酸欠則" && source.article.startsWith("第5条の2"),
    );
    expect(ventilation?.snippet).toMatch(
      /爆発、酸化等を防止するため換気することができない場合[\s\S]*作業の性質上換気することが著しく困難な場合[\s\S]*この限りでない/,
    );
    expect(protection?.snippet).toMatch(
      /同時に就業する労働者の人数と同数以上[\s\S]*空気呼吸器[\s\S]*酸素呼吸器[\s\S]*送気マスク[\s\S]*使用させなければならない/,
    );
    expect(response.effectiveDateStatus).toMatchObject({
      asOf: "2026-08-09",
      status: "current",
    });
  });
});

describe("特別教育の研削といしchipを36条1号へ結ぶ", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const first = await callRouteMode("特別教育の種類を教えて", mode);
    const selected = first.quickReplies.find(
      (reply) => reply.label === "研削といし",
    );
    expect(selected).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const second = await callRouteMode(selected!.prompt, mode, first.context);
    expect(answerText(second)).toMatch(
      /研削といしの取替え.*取替え時の試運転.*特別教育が必要.*国家資格免状ではありません/,
    );
    expect(second.context?.qualificationType).toBe("special-education");
    expect(second.context?.confirmedChoices).toContain("研削といし");
    expect(`${second.context?.equipment ?? ""}`).toMatch(/研削といし/);
    expect(second.quickReplies.some((reply) => reply.label === "研削といし")).toBe(
      false,
    );
    const source = second.sources.find(
      (candidate) =>
        /安衛則|労働安全衛生規則/.test(
          `${candidate.lawShort ?? ""} ${candidate.law}`,
        ) && /第36条/.test(candidate.article),
    );
    expect(source?.item).toBe("第1号");
    expect(source?.snippet).toMatch(
      /第1号.*研削といしの取替え又は取替え時の試運転/,
    );
  }, 30_000);
});

describe("電気の生成chipを配線・開閉器・測定の既知条件へ結合する", () => {
  it.each(["json", "sse"] as const)("$0", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const wiring = await callRouteMode("配線をつなぐ", mode);
    for (const [choice, meaning] of [
      ["電線同士", /電線同士.*電気工事.*施行規則2条.*電気工事士法3条/],
      ["機器端子", /機器端子.*一律に決められません.*600V以下.*軽微工事/],
      ["電圧が不明", /電圧が不明.*確定できません.*電気工事士法3条/],
    ] as const) {
      const selected = wiring.quickReplies.find((reply) => reply.label === choice);
      expect(selected, `wiring:${choice}`).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(selected!.prompt, mode, wiring.context);
      expect(answerText(second), `wiring:${choice}`).toMatch(meaning);
      expect(second.context?.topicDomain, `wiring:${choice}`).toBe("electrical");
      expect(second.context?.workAction, `wiring:${choice}`).toBe(
        "wiring-connection",
      );
      expect(second.context?.confirmedChoices, `wiring:${choice}`).toContain(
        choice,
      );
      expect(second.context?.voltageClass, `wiring:${choice}`).toBeUndefined();
      expect(second.context?.energizedState, `wiring:${choice}`).toBeUndefined();
      expect(answerText(second), `wiring:${choice}: domain jump`).not.toMatch(
        /不整地運搬車|安衛則151条の53/,
      );
      expect(second.sources.length, `wiring:${choice}`).toBeGreaterThan(0);
      if (choice === "機器端子") {
        const minorWork = second.sources.find(
          (source) =>
            /電気工事士法施行令|電工士法令/.test(
              `${source.lawShort ?? ""} ${source.law}`,
            ) && /第1条/.test(source.article),
        );
        expect(minorWork?.item).toBe("第2号");
        expect(minorWork?.snippet).toMatch(
          /第2号[\s\S]*電圧六百ボルト以下[\s\S]*電気機器[\s\S]*端子に電線[\s\S]*ねじ止めする工事/,
        );
      }
    }

    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const breaker = await callRouteMode("ブレーカーを入切するだけ", mode);
    for (const [choice, meaning, voltage] of [
      ["高圧盤", /高圧盤.*特別教育の対象/, "高圧"],
      ["露出型の開閉器", /露出型の開閉器.*確定できません.*充電部分が露出/, undefined],
    ] as const) {
      const selected = breaker.quickReplies.find((reply) => reply.label === choice);
      expect(selected, `breaker:${choice}`).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(selected!.prompt, mode, breaker.context);
      expect(answerText(second), `breaker:${choice}`).toMatch(meaning);
      expect(second.context?.workAction, `breaker:${choice}`).toBe(
        "breaker-operation",
      );
      expect(second.context?.voltageClass, `breaker:${choice}`).toBe(voltage);
      expect(second.context?.confirmedChoices, `breaker:${choice}`).toContain(
        choice,
      );
      expect(second.quickReplies.some((reply) => reply.label === choice)).toBe(false);
    }

    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const tester = await callRouteMode("盤を開けてテスターを当てる", mode);
    const highChoice = tester.quickReplies.find(
      (reply) => reply.label === "高圧設備",
    );
    expect(highChoice).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const high = await callRouteMode(highChoice!.prompt, mode, tester.context);
    expect(high.context?.voltageClass).toBe("高圧");
    expect(high.context?.workAction).toBe("tester-measurement");
    expect(high.clarificationQuestion).toMatch(/充電中.*停電済み/);
    expect(high.clarificationQuestion).not.toMatch(/低圧.*高圧/);
    expect(answerText(high)).toMatch(/高圧設備.*安衛則341条・342条.*停電作業/);
    expect(high.sources.some((source) => /第36条/.test(source.article))).toBe(true);
    expect(high.sources.some((source) => /第341条/.test(source.article))).toBe(true);
    expect(high.sources.some((source) => /第342条/.test(source.article))).toBe(true);
    expect(high.sources.some((source) => /第(?:344|345|346|347)条/.test(source.article))).toBe(
      false,
    );
    for (const [choice, meaning, state] of [
      ["充電中", /充電中の高圧設備.*活線・近接作業措置/, "energized"],
      ["停電済み", /停電済み.*安衛則339条.*停電作業措置/, "de-energized"],
    ] as const) {
      const selected = high.quickReplies.find((reply) => reply.label === choice);
      expect(selected, `tester-high:${choice}`).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const third = await callRouteMode(selected!.prompt, mode, high.context);
      expect(
        answerText(third),
        `tester-high:${choice} context=${JSON.stringify(third.context)}`,
      ).toMatch(meaning);
      expect(third.context?.voltageClass, `tester-high:${choice}`).toBe("高圧");
      expect(third.context?.energizedState, `tester-high:${choice}`).toBe(state);
      expect(third.clarificationQuestion ?? "", `tester-high:${choice}`).not.toMatch(
        /低圧.*高圧|100・200V.*高圧/,
      );
    }

    const lowStoppedChoice = tester.quickReplies.find(
      (reply) => reply.label === "低圧で停電済み",
    );
    expect(lowStoppedChoice).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const lowStopped = await callRouteMode(
      lowStoppedChoice!.prompt,
      mode,
      tester.context,
    );
    expect(lowStopped.context?.voltageClass).toBe("低圧");
    expect(lowStopped.context?.energizedState).toBe("de-energized");
    expect(answerText(lowStopped)).toMatch(/停電済み.*安衛則339条/);
  }, 120_000);
});

describe("生成chipの二段目でも選択済み条件を先頭回答へ消費する", () => {
  it.each(["json", "sse"] as const)("$0: 電気作業主任者の3枝", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const first = await callRouteMode("電気作業で作業主任者は必要？", mode);
    const cases = [
      {
        choice: "停電して扱う",
        meaning: /停電.*安衛則339条.*350条.*作業の指揮者/,
        articles: [/第339条/, /第350条/],
      },
      {
        choice: "高圧・特高の活線・近接",
        meaning:
          /(?=[\s\S]*高圧)(?=[\s\S]*特別高圧)(?=[\s\S]*活線)(?=[\s\S]*350条)(?=[\s\S]*作業の指揮者)/,
        articles: [/第341条/, /第342条/, /第344条/, /第345条/, /第350条/],
      },
      {
        choice: "どちらでもない",
        meaning: /電気作業全般.*一律.*作業主任者.*(?:電気主任技術者|別制度)/,
        articles: [/第14条|第6条/],
      },
    ] as const;
    for (const testCase of cases) {
      const selected = first.quickReplies.find(
        (reply) => reply.label === testCase.choice,
      );
      expect(selected, testCase.choice).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(selected!.prompt, mode, first.context);
      const visible = answerText(second);
      expect(
        visible,
        `${testCase.choice}: context=${JSON.stringify(second.context)} clarification=${second.clarificationQuestion}\n${visible}`,
      ).toMatch(testCase.meaning);
      expect(second.context?.topicDomain, testCase.choice).toBe("electrical");
      expect(
        second.context?.qualificationType,
        testCase.choice,
      ).toBe("work-supervisor");
      expect(second.context?.confirmedChoices, testCase.choice).toContain(
        testCase.choice,
      );
      if (testCase.choice === "高圧・特高の活線・近接") {
        expect(second.context?.voltageClass).toBeUndefined();
        expect(second.context?.workAction).not.toBe("live-work");
        expect([undefined, "unknown"]).toContain(second.context?.workAction);
        expect(Object.keys(second.context ?? {}).every((key) =>
          [
            "topicDomain",
            "workAction",
            "equipment",
            "voltageClass",
            "energizedState",
            "roleType",
            "qualificationType",
            "workDate",
            "confirmedChoices",
          ].includes(key),
        )).toBe(true);
      }
      expect(second.quickReplies.some((reply) => reply.label === testCase.choice)).toBe(
        false,
      );
      expect(visible, `${testCase.choice}: chemical jump`).not.toMatch(
        /新規化学物質|安衛則34条の5|製造・輸入/,
      );
      for (const article of testCase.articles) {
        expect(
          second.sources.some((source) => article.test(source.article)),
          `${testCase.choice}: ${article} sources=${JSON.stringify(second.sources.map((source) => `${source.lawShort ?? source.law}${source.article}`))}`,
        ).toBe(true);
      }
    }
  }, 60_000);

  it.each(["json", "sse"] as const)("$0: 第3種有機溶剤の場所2枝", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const broad = await callRouteMode(
      "有機溶剤作業の主な条件と必要な設備は？",
      mode,
    );
    const thirdChoice = broad.quickReplies.find(
      (reply) => reply.label === "第3種",
    );
    expect(thirdChoice).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const third = await callRouteMode(thirdChoice!.prompt, mode, broad.context);
    for (const testCase of [
      {
        label: /タンク等の内部/,
        meaning: /(?:第3種|第三種).*タンク等の内部.*(?:密閉|局所排気|プッシュプル|全体換気)/,
      },
      {
        label: /不明/,
        meaning: /(?:第3種|第三種).*(?:タンク等の内部|タンク内).*(?:密閉|局所排気|プッシュプル|全体換気).*(?:それ以外の屋内|タンク等の内部以外)/,
      },
    ] as const) {
      const selected = third.quickReplies.find((reply) =>
        testCase.label.test(reply.label),
      );
      expect(
        selected,
        `${testCase.label}: generated=${JSON.stringify(third.quickReplies.map((reply) => reply.label))}`,
      ).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const detail = await callRouteMode(selected!.prompt, mode, third.context);
      const visible = answerText(detail);
      expect(
        visible,
        `${selected!.label}: context=${JSON.stringify(detail.context)} clarification=${detail.clarificationQuestion}\n${visible}`,
      ).toMatch(testCase.meaning);
      expect(detail.context?.topicDomain).toBe("organic-solvent");
      expect(detail.context?.confirmedChoices).toContain("第3種");
      expect(detail.sources.some((source) => /第6条/.test(source.article))).toBe(
        true,
      );
      expect(detail.effectiveDateStatus).toMatchObject({
        status: "current",
        asOf: "2026-08-09",
      });
      expect(visible).not.toMatch(/短文では作業条件を特定できません/);
    }
  }, 60_000);
});

describe("電気の二段chipは行為・電圧・充電状態を累積して反復しない", () => {
  it.each(["json", "sse"] as const)("$0: 作業開始前点検と低圧露出開閉器", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const broad = await callRouteMode("電気の点検する時に必要な資格ある？", mode);
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const start = await callRouteMode("作業開始前点検", mode, broad.context);
    for (const testCase of [
      {
        label: "盤外から見る",
        meaning: /盤外から見る.*(?:非接触|目視).*(?:一律の国家資格|特別教育).*必要とは限りません/,
        action: "visual-inspection",
      },
      {
        label: "充電中の盤内を測る",
        meaning: /充電中の盤内.*測定.*(?:活線|近接|感電防止)/,
        action: "tester-measurement",
      },
    ] as const) {
      const selected = start.quickReplies.find((reply) => reply.label === testCase.label);
      expect(selected, testCase.label).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const detail = await callRouteMode(selected!.prompt, mode, start.context);
      expect(
        answerText(detail),
        `${testCase.label}: ${JSON.stringify({ context: detail.context, clarification: detail.clarificationQuestion, answer: answerText(detail) })}`,
      ).toMatch(testCase.meaning);
      expect(detail.context?.workAction).toBe(testCase.action);
      expect(detail.context?.topicDomain).toBe("electrical");
      expect(detail.quickReplies.some((reply) => reply.label === testCase.label)).toBe(
        false,
      );
    }

    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const breaker = await callRouteMode("ブレーカーを入切するだけ", mode);
    const exposedChoice = breaker.quickReplies.find(
      (reply) => reply.label === "露出型の開閉器",
    );
    expect(exposedChoice).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const exposed = await callRouteMode(exposedChoice!.prompt, mode, breaker.context);
    const lowChoice = exposed.quickReplies.find(
      (reply) => reply.label === "100・200Vの低圧",
    );
    expect(lowChoice).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const low = await callRouteMode(lowChoice!.prompt, mode, exposed.context);
    expect(
      answerText(low),
      JSON.stringify({ context: low.context, answer: answerText(low) }),
    ).toMatch(/100・200V.*低圧.*(?:露出|充電部分).*(?:特別教育|開閉器操作)/);
    expect(low.context?.workAction).toBe("breaker-operation");
    expect(low.context?.voltageClass).toBe("低圧");
    expect(low.context?.confirmedChoices).toContain("露出型の開閉器");
  }, 60_000);

  it.each(["json", "sse"] as const)("$0: 配線接続先×充電状態", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const wiring = await callRouteMode("配線をつなぐ", mode);
    for (const target of ["電線同士", "機器端子"] as const) {
      const selectedTarget = wiring.quickReplies.find(
        (reply) => reply.label === target,
      );
      expect(selectedTarget, target).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const targetResponse = await callRouteMode(
        selectedTarget!.prompt,
        mode,
        wiring.context,
      );
      for (const testCase of [
        {
          label: "100・200Vを停電して作業",
          meaning: /100・200V.*停電.*(?:電気工事士|軽微工事).*安衛則339条/,
          voltage: "低圧",
          state: "de-energized",
        },
        {
          label: "高圧設備を停電して作業",
          meaning: /高圧.*停電.*(?:電気工事士|軽微工事).*安衛則339条/,
          voltage: "高圧",
          state: "de-energized",
        },
        {
          label: "充電中に扱う",
          meaning: /充電中.*(?:電気工事士|軽微工事).*(?:活線|感電防止|特別教育)/,
          voltage: undefined,
          state: "energized",
        },
      ] as const) {
        const stateChoice = targetResponse.quickReplies.find(
          (reply) => reply.label === testCase.label,
        );
        expect(
          stateChoice,
          `${target}:${testCase.label} generated=${JSON.stringify(targetResponse.quickReplies.map((reply) => reply.label))}`,
        ).toBeDefined();
        __resetChatbotCacheForTests();
        __resetRateLimitForTests();
        const detail = await callRouteMode(
          stateChoice!.prompt,
          mode,
          targetResponse.context,
        );
        expect(
          answerText(detail),
          `${target}:${testCase.label} ${JSON.stringify({ context: detail.context, clarification: detail.clarificationQuestion, answer: answerText(detail) })}`,
        ).toMatch(testCase.meaning);
        expect(detail.context?.workAction).toBe("wiring-connection");
        expect(detail.context?.energizedState).toBe(testCase.state);
        if (testCase.voltage) {
          expect(detail.context?.voltageClass).toBe(testCase.voltage);
        }
        if (testCase.voltage && testCase.state === "de-energized") {
          expect(detail.clarificationQuestion).toBeNull();
          expect(detail.quickReplies).toHaveLength(0);
        }
        expect(detail.context?.confirmedChoices).toContain(target);
        expect(detail.quickReplies.some((reply) => reply.label === testCase.label)).toBe(
          false,
        );
      }
    }
  }, 120_000);

  it.each(["json", "sse"] as const)("$0: 見るだけ・複合行為を選択済みとして消費", async (mode) => {
    for (const initial of [
      "電気の点検する時に必要な資格ある？",
      "電気作業の特別教育について教えて",
    ]) {
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const first = await callRouteMode(initial, mode);
      const selected = first.quickReplies.find((reply) => reply.label === "見るだけ");
      expect(selected, initial).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const second = await callRouteMode(selected!.prompt, mode, first.context);
      expect(answerText(second), initial).toMatch(
        /見るだけ.*(?:非接触|目視).*(?:一律の国家資格|特別教育).*必要とは限りません/,
      );
      expect(second.context?.workAction, initial).toBe("visual-inspection");
      expect(second.quickReplies.some((reply) => reply.label === "見るだけ")).toBe(
        false,
      );
      expect(second.clarificationQuestion, initial).toBeNull();
      expect(second.quickReplies, initial).toHaveLength(0);
    }

    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const special = await callRouteMode(
      "電気作業の特別教育について教えて",
      mode,
    );
    const compound = special.quickReplies.find(
      (reply) => reply.label === "盤内測定・配線",
    );
    expect(compound).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const compoundAnswer = await callRouteMode(
      compound!.prompt,
      mode,
      special.context,
    );
    const both = compoundAnswer.quickReplies.find((reply) => reply.label === "両方");
    expect(both).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const bothAnswer = await callRouteMode(
      both!.prompt,
      mode,
      compoundAnswer.context,
    );
    expect(answerText(bothAnswer)).toMatch(
      /測定と配線の両方.*(?:電気工事士|電気工事).*(?:活線|近接|感電防止|特別教育)/,
    );
    expect(bothAnswer.context?.topicDomain).toBe("electrical");
    expect(bothAnswer.context?.workAction).toBe("unknown");
    expect(bothAnswer.context?.confirmedChoices).toContain("両方");
    expect(bothAnswer.quickReplies.some((reply) => reply.label === "両方")).toBe(
      false,
    );
  }, 90_000);

  it.each(["json", "sse"] as const)("$0: 充電部接触chipから活線端子締付けを発明しない", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const broad = await callRouteMode("電気作業の資格は？", mode);
    const compound = broad.quickReplies.find(
      (reply) => reply.label === "配線・充電部を扱う",
    );
    expect(compound).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const grouped = await callRouteMode(compound!.prompt, mode, broad.context);
    const touch = grouped.quickReplies.find(
      (reply) => reply.label === "充電部に触れる",
    );
    expect(touch).toBeDefined();
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const detail = await callRouteMode(touch!.prompt, mode, grouped.context);
    const visible = answerText(detail);
    expect(visible).toMatch(
      /充電部に触れる.*(?:端子を締める作業|配線工事).*(?:意味しません|確定しません)/,
    );
    expect(detail.context?.workAction).toBe("unknown");
    expect(detail.context?.energizedState).toBeUndefined();
    expect(detail.clarificationQuestion).toMatch(/電圧.*停電/);
    expect(detail.quickReplies.some((reply) => reply.label === "充電部に触れる")).toBe(
      false,
    );
  }, 60_000);

  it.each(["json", "sse"] as const)("$0: 既知電圧に別電圧の活線規定を混ぜない", async (mode) => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    const tester = await callRouteMode("盤を開けてテスターを当てる", mode);
    for (const testCase of [
      {
        label: "100・200Vで充電中",
        required: [/第346条/, /第347条/],
        forbidden: [/第341条/, /第342条/, /第344条/, /第345条/],
      },
      {
        label: "高圧設備",
        next: "充電中",
        required: [/第341条/, /第342条/],
        forbidden: [/第346条/, /第347条/],
      },
    ] as const) {
      const selected = tester.quickReplies.find((reply) => reply.label === testCase.label);
      expect(selected, testCase.label).toBeDefined();
      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      let detail = await callRouteMode(selected!.prompt, mode, tester.context);
      if ("next" in testCase) {
        const next = detail.quickReplies.find((reply) => reply.label === testCase.next);
        expect(next, `${testCase.label}:${testCase.next}`).toBeDefined();
        __resetChatbotCacheForTests();
        __resetRateLimitForTests();
        detail = await callRouteMode(next!.prompt, mode, detail.context);
      }
      const articles = detail.sources.map((source) => source.article);
      for (const required of testCase.required) {
        expect(articles.some((article) => required.test(article)), testCase.label).toBe(
          true,
        );
      }
      for (const forbidden of testCase.forbidden) {
        expect(
          articles.some((article) => forbidden.test(article)),
          `${testCase.label}: cross-voltage sources=${JSON.stringify(articles)}`,
        ).toBe(false);
      }
    }
  }, 90_000);
});
