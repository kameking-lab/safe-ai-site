import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CHATBOT_STREAM_PATH = "/api/chatbot/stream";

type AnswerExpectation = {
  conclusion: RegExp;
  branches?: RegExp[];
  evidence?: Array<{
    law: RegExp;
    article?: RegExp;
    paragraph?: RegExp;
    item?: RegExp;
    excerpt: RegExp[];
  }>;
  contextRequired?: RegExp[];
  clarification?: 0 | 1;
  excluded?: RegExp;
  supported?: boolean;
};

type BrowserChatbotPayload = {
  directAnswer?: string;
  importantConditions?: string[];
  sources?: Array<{
    law: string;
    lawShort?: string;
    article: string;
    paragraph?: string;
    item?: string;
    text: string;
    snippet?: string;
  }>;
};

type BrowserCaseEvidence = {
  caseId: number;
  route: "browser";
  normalQuestion: boolean;
  answerFirst: boolean | null;
  substantiveAnswer: boolean | null;
  majorBranchesPresent: boolean | null;
  pureClarification: boolean | null;
  clarificationCorrect: boolean | null;
  clarificationCount: number;
  quickReplyCount: number;
  answerActionCount: number;
  contextRetained: boolean | null;
  categoryDrift: boolean;
  sourceEvidenceVisible: boolean | null;
  sourceSupported: boolean;
  emergencyNormalAnswer: boolean;
  piiOutbound: boolean;
};

const browserCaseEvidence = new Map<number, BrowserCaseEvidence>();

function recordBrowserCase(evidence: BrowserCaseEvidence): void {
  browserCaseEvidence.set(evidence.caseId, evidence);
}

async function writeBrowserEvidence(): Promise<void> {
  const configuredPath = process.env.ANSWER_FIRST_BROWSER_EVIDENCE_PATH;
  if (!configuredPath) return;

  const cases = [...browserCaseEvidence.values()].sort(
    (left, right) => left.caseId - right.caseId,
  );
  expect(cases.map((item) => item.caseId)).toEqual(
    Array.from({ length: 12 }, (_, index) => index + 1),
  );
  const normalCases = cases.filter((item) => item.normalQuestion);
  const contextCases = cases.filter((item) => item.contextRetained !== null);
  const clarificationCases = normalCases.filter(
    (item) => item.clarificationCorrect !== null,
  );
  const rate = (passed: number, total: number) =>
    total === 0 ? 1 : passed / total;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    surface: "browser",
    baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "Playwright configured baseURL",
    caseCount: cases.length,
    metrics: {
      answerFirstRate: rate(
        normalCases.filter((item) => item.answerFirst).length,
        normalCases.length,
      ),
      substantiveAnswerRate: rate(
        normalCases.filter((item) => item.substantiveAnswer).length,
        normalCases.length,
      ),
      majorBranchCoverageRate: rate(
        normalCases.filter((item) => item.majorBranchesPresent).length,
        normalCases.length,
      ),
      citationSupportRate: rate(
        normalCases.filter((item) => item.sourceSupported).length,
        normalCases.length,
      ),
      pureClarificationRate: rate(
        normalCases.filter((item) => item.pureClarification).length,
        normalCases.length,
      ),
      contextRetentionRate: rate(
        contextCases.filter((item) => item.contextRetained).length,
        contextCases.length,
      ),
      clarificationCorrectness: rate(
        clarificationCases.filter((item) => item.clarificationCorrect).length,
        clarificationCases.length,
      ),
      maxClarificationQuestions: Math.max(
        0,
        ...cases.map((item) => item.clarificationCount),
      ),
      maxQuickReplies: Math.max(0, ...cases.map((item) => item.quickReplyCount)),
      maxAnswerActions: Math.max(
        0,
        ...cases.map((item) => item.answerActionCount),
      ),
      categoryDriftCount: cases.filter((item) => item.categoryDrift).length,
      emergencyNormalAnswerCount: cases.filter(
        (item) => item.emergencyNormalAnswer,
      ).length,
      piiOutboundCount: cases.filter((item) => item.piiOutbound).length,
    },
    cases,
  };
  const outputPath = resolve(configuredPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function gotoChatbot(page: Page) {
  const response = await page.goto("/chatbot", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator("[data-chatbot-composer] textarea")).toBeVisible();
}

function parseSseMeta(raw: string): BrowserChatbotPayload {
  const frames = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)];
  const meta = frames.at(-1)?.[1];
  if (!meta) throw new Error(`chatbot SSE meta is missing: ${raw.slice(0, 240)}`);
  return JSON.parse(meta) as BrowserChatbotPayload;
}

function payloadAnswerText(payload: BrowserChatbotPayload): string {
  return [
    payload.directAnswer ?? "",
    ...(payload.importantConditions ?? []),
  ].join("\n");
}

async function inspectSemanticSupport(
  answer: Locator,
  expectation: AnswerExpectation,
  payload: BrowserChatbotPayload,
): Promise<{
  majorBranchesPresent: boolean;
  sourceSupported: boolean;
  contextRetained: boolean | null;
}> {
  const answerText = payloadAnswerText(payload);
  const majorBranchesPresent = (expectation.branches ?? []).every((pattern) =>
    pattern.test(answerText),
  );
  const contextRetained = expectation.contextRequired
    ? expectation.contextRequired.every((pattern) => pattern.test(answerText))
    : null;
  if (expectation.supported === false) {
    return {
      majorBranchesPresent,
      sourceSupported:
        (payload.sources?.length ?? 0) === 0 &&
        (await answer.locator("[data-chatbot-source-details]").count()) === 0,
      contextRetained,
    };
  }

  const requirements = expectation.evidence ?? [];
  const sources = payload.sources ?? [];
  const evidence = answer.locator("[data-chatbot-source-details]");
  if (requirements.length === 0 || (await evidence.count()) !== 1) {
    return { majorBranchesPresent, sourceSupported: false, contextRetained };
  }
  await evidence.evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
  const entries = answer.locator("[data-chatbot-source-entry]");

  for (const requirement of requirements) {
    const sourceIndex = sources.findIndex((source) => {
      const excerpt = source.snippet?.trim() || source.text;
      return (
        requirement.law.test(`${source.lawShort ?? ""} ${source.law}`) &&
        (!requirement.article || requirement.article.test(source.article)) &&
        (!requirement.paragraph ||
          requirement.paragraph.test(source.paragraph ?? "")) &&
        (!requirement.item || requirement.item.test(source.item ?? "")) &&
        requirement.excerpt.every((pattern) => pattern.test(excerpt))
      );
    });
    if (sourceIndex < 0) {
      return { majorBranchesPresent, sourceSupported: false, contextRetained };
    }
    if (!answerText.includes(`［${sourceIndex + 1}］`)) {
      return { majorBranchesPresent, sourceSupported: false, contextRetained };
    }
    const entryText = (await entries.nth(sourceIndex).textContent()) ?? "";
    if (
      !requirement.law.test(entryText) ||
      (requirement.article && !requirement.article.test(entryText)) ||
      (requirement.paragraph && !requirement.paragraph.test(entryText)) ||
      (requirement.item && !requirement.item.test(entryText)) ||
      !requirement.excerpt.every((pattern) => pattern.test(entryText))
    ) {
      return { majorBranchesPresent, sourceSupported: false, contextRetained };
    }
  }
  return { majorBranchesPresent, sourceSupported: true, contextRetained };
}

async function assertAnswerFirst(
  answer: Locator,
  expectation: AnswerExpectation,
  payload: BrowserChatbotPayload,
) {
  const structured = answer.locator("[data-chatbot-structured-answer]");
  const conclusion = structured.locator(":scope > div > p").first();
  await expect(structured).toBeVisible({ timeout: 30_000 });
  await expect(conclusion).toBeVisible();
  await expect(conclusion).toContainText(expectation.conclusion);

  const conclusionText = (await conclusion.innerText()).trim();
  expect(conclusionText.length).toBeGreaterThan(10);
  expect(conclusionText).not.toMatch(/^[^。\n]*[？?]\s*$/u);

  const clarification = structured.locator(
    "[data-chatbot-clarification-question]",
  );
  const clarificationCount = await clarification.count();
  expect(clarificationCount).toBeLessThanOrEqual(1);
  if (expectation.clarification !== undefined) {
    expect(clarificationCount).toBe(expectation.clarification);
  }

  const conditions = structured.locator('ul[aria-label="主な条件"] > li');
  expect(await conditions.count()).toBeLessThanOrEqual(3);

  const quickReplies = answer.locator("[data-chatbot-quick-reply]");
  expect(await quickReplies.count()).toBeLessThanOrEqual(3);
  const actions = answer.locator("[data-chatbot-answer-actions] button");
  expect(await actions.count()).toBeLessThanOrEqual(3);

  expect(
    await answer.evaluate((root) => {
      const first = root.querySelector(
        "[data-chatbot-structured-answer] > div",
      );
      if (!first) return false;
      const later = [
        root.querySelector(
          "[data-chatbot-clarification-question]",
        ),
        ...root.querySelectorAll("[data-chatbot-quick-reply]"),
      ].filter((element): element is Element => element !== null);
      return later.every(
        (element) =>
          Boolean(
            first.compareDocumentPosition(element) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      );
    }),
  ).toBe(true);

  if (expectation.excluded) {
    await expect(answer).not.toContainText(expectation.excluded);
  }

  if (expectation.supported !== false) {
    const evidence = answer.locator("[data-chatbot-source-details]");
    await expect(evidence).toBeVisible();
    expect(
      await evidence.evaluate(
        (element) => (element as HTMLDetailsElement).open,
      ),
    ).toBe(false);
  }
  const semantic = await inspectSemanticSupport(answer, expectation, payload);
  expect(semantic.majorBranchesPresent).toBe(true);
  expect(semantic.sourceSupported).toBe(true);
  if (expectation.contextRequired) {
    expect(semantic.contextRetained).toBe(true);
  }
  return semantic;
}

async function ask(
  page: Page,
  question: string,
  expectation: AnswerExpectation,
  caseId: number,
) {
  const answers = page.locator('article[aria-label="安衛法AIの回答"]');
  const answerCount = await answers.count();
  const composer = page.locator("[data-chatbot-composer]");
  const input = composer.locator("textarea");
  await expect(input).toBeEnabled();
  await input.fill(question);
  await expect(composer.getByRole("button", { name: "送信" })).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === CHATBOT_STREAM_PATH &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await composer.getByRole("button", { name: "送信" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/event-stream");
  expect(response.headers()["x-ai-used"]).toBe("false");
  const payload = parseSseMeta((await response.body()).toString("utf8"));

  const answer = answers.nth(answerCount);
  const semantic = await assertAnswerFirst(answer, expectation, payload);
  const structured = answer.locator("[data-chatbot-structured-answer]");
  const conclusion = structured.locator(":scope > div > p").first();
  const conclusionText = (await conclusion.innerText()).trim();
  const clarificationCount = await structured
    .locator("[data-chatbot-clarification-question]")
    .count();
  const quickReplyCount = await answer
    .locator("[data-chatbot-quick-reply]")
    .count();
  const answerActionCount = await answer
    .locator("[data-chatbot-answer-actions] button")
    .count();
  const answerText = await answer.innerText();
  const sourceEvidenceVisible =
    (await answer.locator("[data-chatbot-source-details]").count()) > 0;
  const answerFirst = await answer.evaluate((root) => {
    const first = root.querySelector(
      "[data-chatbot-structured-answer] > div",
    );
    if (!first) return false;
    const later = [
      root.querySelector(
        "[data-chatbot-clarification-question]",
      ),
      ...root.querySelectorAll("[data-chatbot-quick-reply]"),
    ].filter((element): element is Element => element !== null);
    return later.every(
      (element) =>
        Boolean(
          first.compareDocumentPosition(element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
  });
  const substantiveAnswer =
    conclusionText.length > 10 && !/^[^。\n]*[？?]\s*$/u.test(conclusionText);
  recordBrowserCase({
    caseId,
    route: "browser",
    normalQuestion: true,
    answerFirst,
    substantiveAnswer,
    majorBranchesPresent: semantic.majorBranchesPresent,
    pureClarification: clarificationCount > 0 && !substantiveAnswer,
    clarificationCorrect:
      expectation.clarification === undefined
        ? null
        : clarificationCount === expectation.clarification,
    clarificationCount,
    quickReplyCount,
    answerActionCount,
    contextRetained: semantic.contextRetained,
    categoryDrift:
      caseId === 2 && /酸欠|酸素欠乏|有機溶剤|石綿/u.test(answerText),
    sourceEvidenceVisible,
    sourceSupported: semantic.sourceSupported,
    emergencyNormalAnswer: false,
    piiOutbound: false,
  });
  await expect(input).toBeEnabled({ timeout: 30_000 });
  return answer;
}

async function assertMobileComposerIsUsable(page: Page) {
  const composer = page.locator("[data-chatbot-composer]");
  const input = composer.locator("textarea");
  await expect(composer).toBeVisible();
  const composerBox = await composer.boundingBox();
  expect(composerBox).not.toBeNull();
  expect(composerBox!.x).toBeGreaterThanOrEqual(0);
  expect(composerBox!.x + composerBox!.width).toBeLessThanOrEqual(390);
  expect(composerBox!.y).toBeGreaterThanOrEqual(0);
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);

  const bottomNav = page.locator('[data-mobile-nav="bottom"]');
  if (await bottomNav.isVisible()) {
    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(
      navBox!.y + 1,
    );
  }

  await expect(page.locator('[aria-label="任意Cookieの設定"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cookie設定" })).toHaveCount(0);
  await input.fill("自由入力も利用できます");
  await expect(input).toHaveValue("自由入力も利用できます");
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        ) === element
      );
    }),
  ).toBe(true);
  await input.fill("");
}

test.describe("安衛法AI answer-first 必須12会話ケース", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 390, height: 844 } });
  test.afterAll(writeBrowserEvidence);

  test("Case 1→2: 電気作業の回答後に作業主任者の文脈を同一タブで継続する", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": "198.51.100.181",
    });
    await gotoChatbot(page);

    await ask(page, "電気作業の資格は？", {
      conclusion: /電気工事士|特別教育/u,
      branches: [
        /電気工事士.*(?:設置|変更)|(?:設置|変更).*電気工事士/u,
        /特別教育.*(?:充電電路|低圧|高圧)|(?:充電電路|低圧|高圧).*特別教育/u,
        /(?:盤の外|盤外).*(?:見|表示|異音|異臭).*(?:確認|だけ)|(?:見るだけ|目視).*(?:盤|設備)/u,
        /(?:盤を開け|盤内).*(?:測定|テスター)|配線.*(?:外す|つなぐ|接続)/u,
      ],
      evidence: [
        {
          law: /安衛則|労働安全衛生規則/u,
          article: /第36条/u,
          item: /第4号/u,
          excerpt: [/高圧.*特別高圧/u, /低圧/u, /充電電路/u],
        },
        {
          law: /電気工事士法/u,
          article: /第3条/u,
          paragraph: /第1項.*第2項/u,
          excerpt: [/第一種電気工事士免状/u, /第二種電気工事士免状/u],
        },
      ],
      clarification: 1,
    }, 1);
    await assertMobileComposerIsUsable(page);

    const followup = await ask(page, "作業主任者", {
      conclusion: /作業主任者|作業の指揮者/u,
      branches: [
        /電気作業.*(?:一律|全般).*(?:作業主任者).*(?:ない|ありません)|作業主任者.*(?:一律|全般).*(?:ない|ありません)/u,
        /作業の指揮者.*350条|350条.*作業の指揮者/u,
        /(?:電気主任技術者|主任技術者).*(?:保安監督|工事・維持・運用)|(?:保安監督|工事・維持・運用).*(?:電気主任技術者|主任技術者)/u,
      ],
      evidence: [
        {
          law: /安衛則|労働安全衛生規則/u,
          article: /第350条/u,
          excerpt: [/作業の指揮者を定め/u],
        },
      ],
      contextRequired: [
        /電気/u,
        /作業主任者/u,
        /作業の指揮者|電気主任技術者/u,
      ],
      clarification: 1,
      excluded: /酸欠|酸素欠乏|有機溶剤|石綿/u,
    }, 2);
    await expect(followup).toContainText(/電気作業|電気/u);
    await assertMobileComposerIsUsable(page);
  });

  test("Case 3〜9: 現場の広い質問・閾値質問・曖昧質問も回答を先に示す", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": "198.51.100.182",
    });
    const cases: Array<{
      id: number;
      question: string;
      expectation: AnswerExpectation;
    }> = [
      {
        id: 3,
        question: "フォークリフトの資格は？",
        expectation: {
          conclusion: /1トン|技能講習|特別教育/u,
          branches: [/1トン以上.*技能講習/u, /1トン未満.*特別教育/u],
          evidence: [
            {
              law: /安衛令|労働安全衛生法施行令/u,
              article: /第20条/u,
              excerpt: [/一トン以上/u, /フオークリフト|フォークリフト/u],
            },
            {
              law: /安衛則|労働安全衛生規則/u,
              article: /第36条/u,
              excerpt: [/一トン未満/u, /フオークリフト|フォークリフト/u],
            },
          ],
          clarification: 1,
        },
      },
      {
        id: 4,
        question: "足場の手すり高さは？",
        expectation: {
          conclusion: /85|手すり|2メートル|2m/u,
          branches: [/85(?:センチメートル|cm)|手すり/u, /中桟|35.*50/u],
          evidence: [
            {
              law: /安衛則|労働安全衛生規則/u,
              article: /第563条/u,
              excerpt: [/足場/u, /手すり等/u, /中桟等/u],
            },
            {
              law: /安衛則|労働安全衛生規則/u,
              article: /第552条/u,
              excerpt: [
                /八十五センチメートル|85センチメートル/u,
                /三十五センチメートル以上五十センチメートル以下|35.*50/u,
              ],
            },
          ],
        },
      },
      {
        id: 5,
        question: "玉掛けは何トンから？",
        expectation: {
          conclusion: /1トン|技能講習|特別教育/u,
          branches: [/1トン以上.*技能講習/u, /1トン未満.*特別教育/u],
          evidence: [
            {
              law: /安衛令|労働安全衛生法施行令/u,
              article: /第20条/u,
              excerpt: [/一トン以上/u, /玉掛け/u],
            },
            {
              law: /クレーン則|クレーン等安全規則/u,
              article: /第222条/u,
              excerpt: [/一トン未満/u, /玉掛け/u],
            },
          ],
        },
      },
      {
        id: 6,
        question: "高所作業車は特別教育いる？",
        expectation: {
          conclusion: /2メートル|2m|10メートル|10m|特別教育|技能講習/u,
          branches: [
            /10(?:メートル|m)以上.*技能講習/u,
            /10(?:メートル|m)未満.*特別教育/u,
          ],
          evidence: [
            {
              law: /安衛令|労働安全衛生法施行令/u,
              article: /第20条/u,
              excerpt: [/十メートル以上/u, /高所作業車/u],
            },
            {
              law: /安衛則|労働安全衛生規則/u,
              article: /第36条/u,
              excerpt: [/十メートル未満/u, /高所作業車/u],
            },
          ],
        },
      },
      {
        id: 7,
        question: "酸欠作業の監視人は必要？",
        expectation: {
          conclusion: /監視|酸素|救出/u,
          branches: [
            /常時.*監視.*通報する者|監視人/u,
            /異常.*(?:通報|連絡)|救出/u,
            /酸素.*測定|換気/u,
          ],
          evidence: [
            {
              law: /酸欠則|酸素欠乏症等防止規則/u,
              excerpt: [/常時作業の状況を監視/u, /異常.*通報する者/u],
            },
          ],
        },
      },
      {
        id: 8,
        question: "有機溶剤を屋内で使う",
        expectation: {
          conclusion: /局所排気|プッシュプル|密閉|発散源|SDS/u,
          branches: [/密閉|局所排気|プッシュプル/u, /有機溶剤.*区分|第一種|第二種|第三種/u],
          evidence: [
            {
              law: /有機則|有機溶剤中毒予防規則/u,
              excerpt: [/局所排気|プッシュプル|全体換気/u],
            },
          ],
        },
      },
      {
        id: 9,
        question: "手すりは？",
        expectation: {
          conclusion: /手すり|足場|開口部/u,
          branches: [/足場|開口部/u, /手すり/u],
          evidence: [
            {
              law: /安衛則|労働安全衛生規則/u,
              excerpt: [/手すり/u],
            },
          ],
          clarification: 1,
        },
      },
    ];

    for (const item of cases) {
      await test.step(`Case ${item.id}: ${item.question}`, async () => {
        await gotoChatbot(page);
        await ask(page, item.question, item.expectation, item.id);
        await assertMobileComposerIsUsable(page);
      });
    }
  });

  test("Case 10: 根拠を確認できない範囲外質問は断定せず次の入力を示す", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": "198.51.100.183",
    });
    await gotoChatbot(page);
    const answer = await ask(page, "火星で使う宇宙服の色は？", {
      conclusion: /根拠を確認できない|回答を保留|公式本文を.*確認できない/u,
      clarification: 1,
      supported: false,
    }, 10);
    await expect(answer.locator("[data-chatbot-source-details]")).toHaveCount(0);
    await expect(answer).toContainText(/作業|設備|法令名|条番号/u);
  });

  test("semantic browser gateはgeneric回答・空の根拠・電気1語だけの偽陽性を拒否する", async ({
    page,
  }) => {
    const poisonPayload: BrowserChatbotPayload & Record<string, unknown> = {
      directAnswer: "電気作業について回答します。",
      importantConditions: [],
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第563条",
          text: "電気",
          snippet: "電気",
        },
      ],
      answer: "電気作業について回答します。",
      assumptions: [],
      citations: [],
      clarificationQuestion: null,
      quickReplies: [],
      effectiveDateStatus: {
        asOf: "2026-08-09",
        status: "current",
        label: "2026-08-09時点",
      },
      source_type: "rag",
      confidence: "low",
      requiresHumanReview: true,
    };
    await page.route(`**${CHATBOT_STREAM_PATH}`, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "x-ai-used": "false",
        },
        body: `event: meta\ndata: ${JSON.stringify(poisonPayload)}\n\n`,
      });
    });
    await gotoChatbot(page);
    const input = page.locator("[data-chatbot-composer] textarea");
    await input.fill("電気作業の資格は？");
    await page.getByRole("button", { name: "送信" }).click();
    const answer = page
      .locator('article[aria-label="安衛法AIの回答"]')
      .last();
    await expect(answer).toContainText("電気作業について回答します。");

    const semantic = await inspectSemanticSupport(
      answer,
      {
        conclusion: /電気/u,
        branches: [
          /電気工事士.*(?:設置|変更)/u,
          /特別教育.*(?:充電電路|低圧|高圧)/u,
          /見るだけ.*(?:盤|測定|配線)/u,
        ],
        evidence: [
          {
            law: /安衛則|労働安全衛生規則/u,
            article: /第36条/u,
            item: /第4号/u,
            excerpt: [/充電電路/u, /低圧/u, /高圧/u],
          },
        ],
      },
      poisonPayload,
    );
    expect(semantic.majorBranchesPresent).toBe(false);
    expect(semantic.sourceSupported).toBe(false);
  });

  test("Case 11〜12: 緊急・PIIは通常回答や外部送信より前に端末内で遮断する", async ({
    page,
  }) => {
    const chatbotRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/chatbot")) {
        chatbotRequests.push(request.url());
      }
    });

    await gotoChatbot(page);
    await page
      .locator("[data-chatbot-composer] textarea")
      .fill("反応がありません");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(
      page.locator('[role="alert"][data-safety-kind="emergency"]'),
    ).toContainText("119");
    await expect(page.locator('[data-chatbot-answer=""]')).toHaveCount(0);
    await expect(page.locator("[data-chatbot-quick-reply]")).toHaveCount(0);
    expect(chatbotRequests).toEqual([]);
    recordBrowserCase({
      caseId: 11,
      route: "browser",
      normalQuestion: false,
      answerFirst: null,
      substantiveAnswer: null,
      majorBranchesPresent: null,
      pureClarification: null,
      clarificationCorrect: null,
      clarificationCount: 0,
      quickReplyCount: 0,
      answerActionCount: 0,
      contextRetained: null,
      categoryDrift: false,
      sourceEvidenceVisible: null,
      sourceSupported: true,
      emergencyNormalAnswer: false,
      piiOutbound: false,
    });

    await gotoChatbot(page);
    const pii = "山田 太郎 worker@example.com 090-1234-5678";
    await page.locator("[data-chatbot-composer] textarea").fill(pii);
    await page.getByRole("button", { name: "送信" }).click();
    await expect(
      page.locator('[role="alert"][data-safety-kind="privacy"]'),
    ).toBeVisible();
    await expect(page.locator('[data-chatbot-answer=""]')).toHaveCount(0);
    await expect(page.locator("[data-chatbot-quick-reply]")).toHaveCount(0);
    expect(chatbotRequests).toEqual([]);
    await expect(page.getByText(pii, { exact: true })).toHaveCount(0);
    const browserStorage = await page.evaluate(() => {
      const values: string[] = [];
      for (const storage of [localStorage, sessionStorage]) {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          values.push(`${key}:${key ? storage.getItem(key) : ""}`);
        }
      }
      return values.join("\n");
    });
    expect(browserStorage).not.toContain(pii);
    recordBrowserCase({
      caseId: 12,
      route: "browser",
      normalQuestion: false,
      answerFirst: null,
      substantiveAnswer: null,
      majorBranchesPresent: null,
      pureClarification: null,
      clarificationCorrect: null,
      clarificationCount: 0,
      quickReplyCount: 0,
      answerActionCount: 0,
      contextRetained: null,
      categoryDrift: false,
      sourceEvidenceVisible: null,
      sourceSupported: true,
      emergencyNormalAnswer: false,
      piiOutbound: chatbotRequests.length > 0,
    });
    await assertMobileComposerIsUsable(page);
  });
});
