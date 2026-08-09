import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import {
  expect,
  test,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

import { ELECTRIC_CHATBOT_HOLDOUT_2026_08_09 } from "../src/data/electric-chatbot-holdout-2026-08-09";
import type { ChatbotResponse } from "../src/lib/chatbot-contract";
import {
  electricHoldoutInitialContext,
  evaluateElectricHoldoutCaseFromTurns,
  formatElectricHoldoutFailures,
  hasOnlySafeElectricalStructuredContext,
  summarizeElectricHoldoutResults,
  type ElectricHoldoutCaseResult,
  type ElectricHoldoutTurnResult,
} from "../src/lib/electric-chatbot-holdout-evaluator";
import type { PublicLegalConversationContext } from "../src/lib/legal-conversation-public-context";

const HOLDOUT_PATH = resolve(
  process.cwd(),
  "src/data/electric-chatbot-holdout-2026-08-09.ts",
);
const CHECKSUM_PATH = resolve(
  process.cwd(),
  "src/data/electric-chatbot-holdout-2026-08-09.sha256",
);
const OFFICIAL_SOURCE_HOSTS = new Set([
  "laws.e-gov.go.jp",
  "mhlw.go.jp",
  "www.mhlw.go.jp",
  "meti.go.jp",
  "www.meti.go.jp",
]);

type RequestObservation = {
  caseId: string;
  turnIndex: number;
  usedStructuredContext: boolean;
  safeStructuredContext: boolean;
  historyAbsent: boolean;
};

type UiCaseEvidence = {
  id: string;
  turnCount: number;
  structuredAnswerTurnCount: number;
  expandedEvidenceTurnCount: number;
  quickReplyAlignedTurnCount: number;
  contextRequestTurnCount: number;
  failures: string[];
};

function normalizeVisibleText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, "").trim();
}

function isChatbotResponse(value: unknown): value is ChatbotResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatbotResponse>;
  return (
    typeof candidate.answer === "string" &&
    typeof candidate.directAnswer === "string" &&
    Array.isArray(candidate.assumptions) &&
    Array.isArray(candidate.importantConditions) &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.citations) &&
    Array.isArray(candidate.quickReplies) &&
    (candidate.clarificationQuestion === null ||
      typeof candidate.clarificationQuestion === "string") &&
    typeof candidate.confidence === "string" &&
    Boolean(candidate.effectiveDateStatus) &&
    candidate.requiresHumanReview === true
  );
}

async function responseMeta(response: Response): Promise<ChatbotResponse> {
  const body = (await response.body()).toString("utf8");
  const frames = body.split(/\r?\n\r?\n/gu);
  let meta: unknown = null;
  for (const frame of frames) {
    const event = frame
      .split(/\r?\n/gu)
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    if (event !== "meta") continue;
    const data = frame
      .split(/\r?\n/gu)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (data) meta = JSON.parse(data) as unknown;
  }
  if (!isChatbotResponse(meta)) throw new Error("invalid-sse-meta-contract");
  return meta;
}

async function sendQuestion(
  page: Page,
  question: string,
): Promise<{ answer: Locator; response: Response; payload: ChatbotResponse }> {
  const answers = page.locator('article[aria-label="安衛法AIの回答"]');
  const before = await answers.count();
  const composer = page.locator("[data-chatbot-composer]");
  await composer.locator("textarea").fill(question);
  const responsePromise = page.waitForResponse(
    (candidate) =>
      new URL(candidate.url()).pathname === "/api/chatbot/stream" &&
      candidate.request().method() === "POST",
    { timeout: 120_000 },
  );
  await composer.getByRole("button", { name: "送信" }).click();
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error("deployed-sse-status");
  const answer = answers.nth(before);
  await answer
    .locator("[data-chatbot-structured-answer]")
    .waitFor({ state: "visible", timeout: 120_000 });
  await composer.locator("textarea").waitFor({ state: "visible" });
  if (!(await composer.locator("textarea").isEnabled())) {
    throw new Error("composer-not-restored");
  }
  return { answer, response, payload: await responseMeta(response) };
}

async function inspectRenderedTurn(
  answer: Locator,
  payload: ChatbotResponse,
): Promise<string[]> {
  const failures: string[] = [];
  const structured = answer.locator("[data-chatbot-structured-answer]");
  if ((await structured.count()) !== 1) failures.push("structured-answer-count");
  const visibleText = normalizeVisibleText(await structured.innerText());
  if (!visibleText.includes(normalizeVisibleText(payload.directAnswer))) {
    failures.push("direct-answer-not-rendered");
  }

  const clarification = answer.locator(
    "[data-chatbot-clarification-question]",
  );
  const expectedClarificationCount = payload.clarificationQuestion ? 1 : 0;
  if ((await clarification.count()) !== expectedClarificationCount) {
    failures.push("clarification-render-mismatch");
  }

  const quickReplies = answer.locator("[data-chatbot-quick-reply]");
  const quickReplyCount = await quickReplies.count();
  if (quickReplyCount > 3 || quickReplyCount !== payload.quickReplies.length) {
    failures.push("quick-reply-count-mismatch");
  } else {
    const labels = (await quickReplies.allInnerTexts()).map((value) =>
      value.trim(),
    );
    if (
      labels.some(
        (label, index) => label !== payload.quickReplies[index]?.label.trim(),
      )
    ) {
      failures.push("quick-reply-label-mismatch");
    }
  }

  const evidence = answer.locator("[data-chatbot-source-details]");
  if ((await evidence.count()) !== 1) {
    failures.push("evidence-fold-count");
    return failures;
  }
  const summaryText = (await evidence.locator("summary").innerText()).trim();
  const declaredCount = Number(summaryText.match(/^根拠\s+(\d+)件$/u)?.[1]);
  if (!Number.isInteger(declaredCount) || declaredCount < 1) {
    failures.push("evidence-count-label");
  }
  await evidence.locator("summary").click();
  if ((await evidence.getAttribute("open")) === null) {
    failures.push("evidence-fold-did-not-open");
  }
  const entries = evidence.locator("[data-chatbot-source-entry]");
  const entryCount = await entries.count();
  if (entryCount < 1) failures.push("evidence-entry-empty");
  let legalLocatorCount = 0;
  for (let index = 0; index < entryCount; index += 1) {
    const entry = entries.nth(index);
    const entryText = await entry.innerText();
    for (const label of ["法令名:", "施行状態:", "該当箇所:"]) {
      if (!entryText.includes(label)) failures.push("evidence-locator-incomplete");
    }
    const hasLegalLocator = ["条:", "項:", "号:"].every((label) =>
      entryText.includes(label),
    );
    if (hasLegalLocator) {
      legalLocatorCount += 1;
    } else if (!entryText.includes("資料内位置:")) {
      failures.push("evidence-position-missing");
    }
    const official = entry.getByRole("link", { name: "公式原文" });
    if ((await official.count()) !== 1) {
      failures.push("official-source-link-missing");
      continue;
    }
    const href = await official.getAttribute("href");
    try {
      if (!href || !OFFICIAL_SOURCE_HOSTS.has(new URL(href).hostname)) {
        failures.push("official-source-host");
      }
    } catch {
      failures.push("official-source-url");
    }
  }
  if (legalLocatorCount < 1) failures.push("legal-locator-missing");
  if ((await answer.locator("[data-chatbot-answer-feedback]").count()) !== 1) {
    failures.push("feedback-not-rendered");
  }
  return [...new Set(failures)];
}

test.use({ viewport: { width: 390, height: 844 } });

test("fixed electrical holdout passes all 72 cases and 88 turns through deployed browser SSE/UI", async ({
  page,
}) => {
  test.setTimeout(20 * 60_000);

  const allQuestions = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.flatMap(
    (testCase) => [...testCase.turns],
  );
  let rawQuestionUrlLeak = false;
  let rawQuestionStorageLeak = false;
  let rawQuestionConsoleLeak = false;
  let rawQuestionNonChatRequestLeak = false;
  let activeCaseId = "";
  let activeTurnIndex = -1;
  let activeInitialContext: PublicLegalConversationContext | undefined;
  const observations: RequestObservation[] = [];
  const caseResults: ElectricHoldoutCaseResult[] = [];
  const uiCases: UiCaseEvidence[] = [];
  let requestCount = 0;
  let externalAiUsedCount = 0;
  let previewModeMissingCount = 0;

  const containsRawQuestion = (value: string): boolean =>
    allQuestions.some(
      (question) =>
        value.includes(question) || value.includes(encodeURIComponent(question)),
    );

  page.on("console", (message) => {
    if (containsRawQuestion(message.text())) rawQuestionConsoleLeak = true;
  });
  page.on("request", (request) => {
    if (containsRawQuestion(request.url())) rawQuestionUrlLeak = true;
    const path = new URL(request.url()).pathname;
    if (
      path !== "/api/chatbot/stream" &&
      containsRawQuestion(request.postData() ?? "")
    ) {
      rawQuestionNonChatRequestLeak = true;
    }
  });

  await page.route("**/api/chatbot/stream", async (route) => {
    const request = route.request();
    const parsed = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const fixtureContext =
      activeTurnIndex === 0 ? activeInitialContext : undefined;
    const context = (fixtureContext ?? parsed.context ?? {}) as
      | PublicLegalConversationContext
      | undefined;
    const safeStructuredContext = hasOnlySafeElectricalStructuredContext(
      context ?? {},
    );
    observations.push({
      caseId: activeCaseId,
      turnIndex: activeTurnIndex,
      usedStructuredContext: Boolean(context && Object.keys(context).length > 0),
      safeStructuredContext,
      historyAbsent: !("history" in parsed),
    });

    const headers: Record<string, string> = {
      ...request.headers(),
      "x-forwarded-for": `198.51.100.${100 + Number(activeCaseId.slice(3))}`,
    };
    delete headers["content-length"];
    if (fixtureContext) {
      await route.continue({
        headers,
        postData: JSON.stringify({ ...parsed, context: fixtureContext }),
      });
      return;
    }
    await route.continue({ headers });
  });

  await page.goto("/chatbot", { waitUntil: "domcontentloaded" });

  for (const [caseIndex, testCase] of
    ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.entries()) {
    if (caseIndex > 0) {
      await page.getByRole("button", { name: "新しい相談" }).click();
      if (
        (await page.locator('article[aria-label="安衛法AIの回答"]').count()) !==
        0
      ) {
        throw new Error("new-conversation-did-not-clear-context");
      }
    }
    activeCaseId = testCase.id;
    activeInitialContext = electricHoldoutInitialContext(testCase);
    const turns: ElectricHoldoutTurnResult[] = [];
    const uiFailures: string[] = [];
    let structuredAnswerTurnCount = 0;
    let expandedEvidenceTurnCount = 0;
    let quickReplyAlignedTurnCount = 0;

    for (const [turnIndex, question] of testCase.turns.entries()) {
      activeTurnIndex = turnIndex;
      const observationIndex = observations.length;
      const { answer, response, payload } = await sendQuestion(page, question);
      requestCount += 1;
      const aiUsed = response.headers()["x-ai-used"];
      const cacheHit = response.headers()["x-cache-hit"];
      if (aiUsed === "true") externalAiUsedCount += 1;
      if (response.headers()["x-safe-ai-preview-mode"] !== "dry-run") {
        previewModeMissingCount += 1;
      }
      if (!(aiUsed === "false" || (aiUsed === undefined && cacheHit === "true"))) {
        uiFailures.push(`turn-${turnIndex + 1}:external-ai-not-proven-off`);
      }
      const observation = observations[observationIndex];
      if (!observation || observation.caseId !== testCase.id) {
        uiFailures.push(`turn-${turnIndex + 1}:request-observation-missing`);
      } else {
        if (!observation.historyAbsent) {
          uiFailures.push(`turn-${turnIndex + 1}:raw-history-sent`);
        }
        if (!observation.safeStructuredContext) {
          uiFailures.push(`turn-${turnIndex + 1}:unsafe-context`);
        }
      }
      const renderedFailures = await inspectRenderedTurn(answer, payload);
      uiFailures.push(
        ...renderedFailures.map((failure) => `turn-${turnIndex + 1}:${failure}`),
      );
      if (!renderedFailures.includes("structured-answer-count")) {
        structuredAnswerTurnCount += 1;
      }
      if (
        !renderedFailures.some((failure) =>
          failure.startsWith("evidence-") ||
          failure.startsWith("official-source-"),
        )
      ) {
        expandedEvidenceTurnCount += 1;
      }
      if (!renderedFailures.some((failure) => failure.startsWith("quick-reply-"))) {
        quickReplyAlignedTurnCount += 1;
      }
      turns.push({
        message: question,
        retrievalQuery: question,
        usedStructuredContext: observation?.usedStructuredContext ?? false,
        response: payload,
      });
    }

    const result = evaluateElectricHoldoutCaseFromTurns(testCase, turns);
    if (uiFailures.length > 0) {
      result.failures.push(...uiFailures);
      result.passed = false;
    }
    caseResults.push(result);
    uiCases.push({
      id: testCase.id,
      turnCount: testCase.turns.length,
      structuredAnswerTurnCount,
      expandedEvidenceTurnCount,
      quickReplyAlignedTurnCount,
      contextRequestTurnCount: turns.filter((turn) => turn.usedStructuredContext)
        .length,
      failures: [...result.failures],
    });

    const storageDump = await page.evaluate(() =>
      [localStorage, sessionStorage]
        .flatMap((storage) =>
          Array.from({ length: storage.length }, (_, index) => {
            const key = storage.key(index);
            return `${key}:${key ? storage.getItem(key) : ""}`;
          }),
        )
        .join("\n"),
    );
    if (containsRawQuestion(storageDump)) rawQuestionStorageLeak = true;
  }

  const expectedChecksum = (await readFile(CHECKSUM_PATH, "utf8"))
    .trim()
    .split(/\s+/u)[0]!;
  const actualChecksum = createHash("sha256")
    .update(await readFile(HOLDOUT_PATH))
    .digest("hex");
  const metrics = summarizeElectricHoldoutResults(caseResults);
  const failed = caseResults.filter((result) => !result.passed);
  const expandedEvidenceTurnCount = uiCases.reduce(
    (sum, item) => sum + item.expandedEvidenceTurnCount,
    0,
  );
  const structuredAnswerTurnCount = uiCases.reduce(
    (sum, item) => sum + item.structuredAnswerTurnCount,
    0,
  );
  const quickReplyAlignedTurnCount = uiCases.reduce(
    (sum, item) => sum + item.quickReplyAlignedTurnCount,
    0,
  );
  const evidenceCandidate = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    route: "deployed-browser-sse-ui",
    fixture: {
      id: "electric-chatbot-holdout-2026-08-09",
      checksumSha256: actualChecksum,
      checksumUnchanged: actualChecksum === expectedChecksum,
      caseCount: 72,
      turnCount: 88,
    },
    requestCount,
    externalAiUsedCount,
    previewModeMissingCount,
    structuredAnswerTurnCount,
    expandedEvidenceTurnCount,
    quickReplyAlignedTurnCount,
    privacy: {
      rawQuestionInUrl: rawQuestionUrlLeak,
      rawQuestionInStorage: rawQuestionStorageLeak,
      rawQuestionInConsole: rawQuestionConsoleLeak,
      rawQuestionInNonChatRequest: rawQuestionNonChatRequestLeak,
    },
    metrics,
    cases: uiCases,
  };
  const rawQuestionPersistedInEvidence = containsRawQuestion(
    JSON.stringify(evidenceCandidate),
  );
  const rawQuestionLeakCount = [
    rawQuestionUrlLeak,
    rawQuestionStorageLeak,
    rawQuestionConsoleLeak,
    rawQuestionNonChatRequestLeak,
    rawQuestionPersistedInEvidence,
  ].filter(Boolean).length;
  const passed =
    actualChecksum === expectedChecksum &&
    requestCount === 88 &&
    externalAiUsedCount === 0 &&
    previewModeMissingCount === 0 &&
    observations.length === 88 &&
    observations.every(
      (item) => item.historyAbsent && item.safeStructuredContext,
    ) &&
    expandedEvidenceTurnCount === 88 &&
    structuredAnswerTurnCount === 88 &&
    quickReplyAlignedTurnCount === 88 &&
    rawQuestionLeakCount === 0 &&
    failed.length === 0;

  const configuredEvidencePath =
    process.env.ELECTRIC_HOLDOUT_BROWSER_EVIDENCE_PATH;
  if (configuredEvidencePath) {
    const evidencePath = resolve(configuredEvidencePath);
    const repositoryRoot = resolve(process.cwd(), "..");
    const evidenceRelative = relative(repositoryRoot, evidencePath);
    if (
      evidenceRelative === "" ||
      (!evidenceRelative.startsWith(`..${sep}`) && evidenceRelative !== "..")
    ) {
      throw new Error("browser-holdout-evidence-must-remain-external");
    }
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(
      evidencePath,
      `${JSON.stringify(
        {
          ...evidenceCandidate,
          rawQuestionLeakCount,
          privacy: {
            ...evidenceCandidate.privacy,
            rawQuestionPersistedInEvidence,
          },
          passed,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  const semanticReport = formatElectricHoldoutFailures({
    basisDate: "2026-08-09",
    fixtureContext: "classifier-first-with-explicit-context-fixtures",
    results: caseResults,
    metrics,
  });
  expect(actualChecksum, "frozen holdout checksum changed").toBe(
    expectedChecksum,
  );
  expect(requestCount, "deployed browser request coverage").toBe(88);
  expect(externalAiUsedCount, "external AI was used").toBe(0);
  expect(previewModeMissingCount, "Preview dry-run header missing").toBe(0);
  expect(observations, "request context boundary").toHaveLength(88);
  expect(
    observations.every((item) => item.historyAbsent && item.safeStructuredContext),
    "unsafe request context or raw history",
  ).toBe(true);
  expect(structuredAnswerTurnCount, "structured UI coverage").toBe(88);
  expect(expandedEvidenceTurnCount, "expanded evidence UI coverage").toBe(88);
  expect(quickReplyAlignedTurnCount, "quick reply UI alignment").toBe(88);
  expect(rawQuestionLeakCount, "raw question browser leak").toBe(0);
  expect(failed, semanticReport).toHaveLength(0);
  expect(metrics).toMatchObject({
    totalCases: 72,
    passedCases: 72,
    totalTurns: 88,
    firstTurnUsefulAnswerRate: 100,
    answerFirstRate: 100,
    substantiveAnswerRate: 100,
    pureClarificationRate: 0,
    contextRetentionRate: 100,
    irrelevantQuickReplyRate: 0,
    unrelatedDomainJumpCount: 0,
    citationSupportRate: 100,
    effectiveDateCurrentRate: 100,
  });
});
