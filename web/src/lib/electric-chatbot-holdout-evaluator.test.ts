import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ELECTRIC_CHATBOT_HOLDOUT_2026_08_09 } from "@/data/electric-chatbot-holdout-2026-08-09";
import { POST as postChatbotJson } from "@/app/api/chatbot/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import type { ChatbotResponse } from "@/lib/chatbot-contract";
import {
  electricHoldoutInitialContext,
  evaluateElectricHoldoutCaseFromTurns,
  evaluateElectricChatbotHoldout,
  formatElectricHoldoutFailures,
  hasOnlySafeElectricalStructuredContext,
  summarizeElectricHoldoutResults,
  type ElectricHoldoutTurnResult,
} from "@/lib/electric-chatbot-holdout-evaluator";

const HOLDOUT_PATH = resolve(
  process.cwd(),
  "src/data/electric-chatbot-holdout-2026-08-09.ts",
);
const CHECKSUM_PATH = resolve(
  process.cwd(),
  "src/data/electric-chatbot-holdout-2026-08-09.sha256",
);

afterEach(() => {
  vi.unstubAllEnvs();
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
});

describe("fixed electrical chatbot semantic holdout", () => {
  it("keeps the pre-implementation 72-case holdout immutable", () => {
    const expected = readFileSync(CHECKSUM_PATH, "utf8").trim().split(/\s+/)[0];
    const actual = createHash("sha256")
      .update(readFileSync(HOLDOUT_PATH))
      .digest("hex");

    expect(ELECTRIC_CHATBOT_HOLDOUT_2026_08_09).toHaveLength(72);
    expect(actual).toBe(expected);
  });

  it("passes meaning, context, answer-first, citation, and temporal gates", () => {
    const evaluation = evaluateElectricChatbotHoldout();
    const report = formatElectricHoldoutFailures(evaluation);

    expect(evaluation.metrics.totalCases).toBe(72);
    expect(
      evaluation.results.filter((result) => !result.passed).length,
      report,
    ).toBe(0);
    expect(evaluation.metrics.firstTurnUsefulAnswerRate).toBe(100);
    expect(evaluation.metrics.answerFirstRate).toBe(100);
    expect(evaluation.metrics.substantiveAnswerRate).toBe(100);
    expect(evaluation.metrics.pureClarificationRate).toBe(0);
    expect(evaluation.metrics.contextRetentionRate).toBe(100);
    expect(evaluation.metrics.irrelevantQuickReplyRate).toBe(0);
    expect(evaluation.metrics.unrelatedDomainJumpCount).toBe(0);
    expect(evaluation.metrics.citationSupportRate).toBe(100);
    expect(evaluation.metrics.effectiveDateCurrentRate).toBe(100);
    expect(evaluation.metrics.classificationEligibleTotal).toBe(67);
    expect(evaluation.metrics.classificationEligiblePassed).toBe(67);
    expect(evaluation.metrics.classificationEligibleRate).toBe(100);
    expect(evaluation.metrics.contextFixtureCount).toBe(5);
    expect(evaluation.metrics.safetyCorrectedFixtureCount).toBe(1);
    expect(
      evaluation.results.find((result) => result.id === "EL-047")
        ?.fixtureSafetyCorrection,
    ).toEqual({
      frozenExpectedAction: "visual-inspection",
      enforcedExpectedAction: "unknown",
      reason:
        "『配線は触らない』は行為の否定条件であり、盤外目視を選んだという肯定情報ではないため",
    });
    expect(
      evaluation.results
        .filter(
          (result) =>
            result.initialContextMode === "electrical-context-fixture",
        )
        .map((result) => result.id),
    ).toEqual(["EL-020", "EL-031", "EL-038", "EL-070", "EL-072"]);
  });

  it(
    "AI OFFのactual JSON route 72件も命題対応citation support 100%を満たす",
    async () => {
      vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
      __resetChatbotCacheForTests();
      const caseResults = [];

      for (const testCase of ELECTRIC_CHATBOT_HOLDOUT_2026_08_09) {
        const initialContext = electricHoldoutInitialContext(testCase);
        let context: ChatbotResponse["context"] = initialContext;
        const turns: ElectricHoldoutTurnResult[] = [];

        for (const message of testCase.turns) {
          __resetRateLimitForTests();
          if (context) {
            expect(
              hasOnlySafeElectricalStructuredContext(context),
              `${testCase.id}: unsafe next-turn request context`,
            ).toBe(true);
          }
          const requestBody = {
            message,
            ...(context ? { context } : {}),
            lawCategory: "all",
            privacyConfirmed: true,
          };
          const response = await postChatbotJson(
            new Request("http://localhost/api/chatbot", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(requestBody),
            }),
          );
          expect(response.status, `${testCase.id}: ${message}`).toBe(200);
          const payload = (await response.json()) as ChatbotResponse;
          expect(
            hasOnlySafeElectricalStructuredContext(payload.context ?? {}),
            `${testCase.id}: unsafe route response context`,
          ).toBe(true);
          turns.push({
            message,
            retrievalQuery: message,
            usedStructuredContext:
              turns.length > 0 || Boolean(initialContext),
            response: payload,
          });
          context = payload.context ?? context;
        }

        caseResults.push(
          evaluateElectricHoldoutCaseFromTurns(testCase, turns),
        );
      }

      const metrics = summarizeElectricHoldoutResults(caseResults);
      const failed = caseResults.filter((result) => !result.passed);
      expect(
        failed,
        formatElectricHoldoutFailures({
          basisDate: "2026-08-09",
          fixtureContext: "classifier-first-with-explicit-context-fixtures",
          results: caseResults,
          metrics,
        }),
      ).toHaveLength(0);
      expect(metrics).toMatchObject({
        totalCases: 72,
        passedCases: 72,
        citationSupportRate: 100,
      });
    },
    120_000,
  );

  it.each([
    {
      id: "EL-044",
      contradictoryQuestion: "100・200Vと高圧のどちらですか？",
      contradictoryOption: "高圧設備",
      forbiddenRealPrompt: /高圧|特高/,
    },
    {
      id: "EL-052",
      contradictoryQuestion: "100・200Vと高圧のどちらですか？",
      contradictoryOption: "100・200Vの低圧",
      forbiddenRealPrompt: /低圧|100|200/,
    },
    {
      id: "EL-053",
      contradictoryQuestion: "100・200Vと高圧のどちらですか？",
      contradictoryOption: "高圧設備",
      forbiddenRealPrompt: /高圧|特高/,
    },
    {
      id: "EL-054",
      contradictoryQuestion: "充電部分は露出していますか？",
      contradictoryOption: "露出型の開閉器",
      forbiddenRealPrompt: /露出型|露出していますか/,
    },
  ])(
    "$id は既知条件と矛盾する確認質問・quick replyを意味的に失敗させる",
    ({ id, contradictoryQuestion, contradictoryOption, forbiddenRealPrompt }) => {
      const evaluation = evaluateElectricChatbotHoldout();
      const testCase = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.find(
        (candidate) => candidate.id === id,
      );
      const result = evaluation.results.find((candidate) => candidate.id === id);
      if (!testCase || !result) throw new Error(`${id} fixture is missing`);

      const finalTurn = result.turns.at(-1)!;
      const realClarification = [
        finalTurn.response.clarificationQuestion ?? "",
        ...finalTurn.response.quickReplies.flatMap((reply) => [
          reply.label,
          reply.prompt,
        ]),
      ].join(" ");
      expect(realClarification).not.toMatch(forbiddenRealPrompt);
      expect(result.checks.knownConditionsNotReasked).toBe(true);

      const poisonedTurns = result.turns.map((turn, index) =>
        index === result.turns.length - 1
          ? {
              ...turn,
              response: {
                ...turn.response,
                clarificationQuestion: contradictoryQuestion,
                clarification: {
                  question: contradictoryQuestion,
                  options: [contradictoryOption],
                },
                quickReplies: [
                  {
                    label: contradictoryOption,
                    prompt: contradictoryOption,
                  },
                ],
              },
            }
          : turn,
      );
      const poisoned = evaluateElectricHoldoutCaseFromTurns(
        testCase,
        poisonedTurns,
      );

      // The old taxonomy-only check accepts these chips.  The new structured
      // context check must still reject the contradictory clarification.
      expect(poisoned.checks.quickRepliesRelevant).toBe(true);
      expect(poisoned.checks.knownConditionsNotReasked).toBe(false);
      expect(poisoned.failures).toContain(
        "clarification repeats or contradicts a known condition",
      );
    },
  );

  it("EL-016 は低圧347条を数値距離の法定措置として扱う回答を失敗させる", () => {
    const evaluation = evaluateElectricChatbotHoldout();
    const testCase = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.find(
      (candidate) => candidate.id === "EL-016",
    );
    const result = evaluation.results.find(
      (candidate) => candidate.id === "EL-016",
    );
    if (!testCase || !result) throw new Error("EL-016 fixture is missing");

    expect(result.checks.lowVoltageDistanceNotMisstated).toBe(true);
    const poisonedTurns = result.turns.map((turn, index) =>
      index === result.turns.length - 1
        ? {
            ...turn,
            response: {
              ...turn.response,
              importantConditions: [
                ...turn.response.importantConditions,
                "低圧では充電部までの距離を確保することが347条の法定措置です。［1］",
              ],
            },
          }
        : turn,
    );
    const poisoned = evaluateElectricHoldoutCaseFromTurns(
      testCase,
      poisonedTurns,
    );

    expect(poisoned.checks.lowVoltageDistanceNotMisstated).toBe(false);
    expect(poisoned.failures).toContain(
      "low-voltage proximity was misstated as a distance rule",
    );
  });

  it("EL-004 は低圧・高圧・特高の特別教育対象を一括否定する矛盾回答を失敗させる", () => {
    const evaluation = evaluateElectricChatbotHoldout();
    const testCase = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.find(
      (candidate) => candidate.id === "EL-004",
    );
    const result = evaluation.results.find(
      (candidate) => candidate.id === "EL-004",
    );
    if (!testCase || !result) throw new Error("EL-004 fixture is missing");

    expect(result.checks.legalPolarityConsistent).toBe(true);
    expect(result.checks.concepts["low-voltage-special-education-scope"]).toBe(
      true,
    );
    expect(result.checks.concepts["high-voltage-special-education-scope"]).toBe(
      true,
    );

    const poisonedTurns = result.turns.map((turn, index) =>
      index === result.turns.length - 1
        ? {
            ...turn,
            response: {
              ...turn.response,
              importantConditions: [
                ...turn.response.importantConditions,
                "高圧・特高と低圧はいずれも特別教育対象ではない［1］",
              ],
            },
          }
        : turn,
    );
    const poisoned = evaluateElectricHoldoutCaseFromTurns(
      testCase,
      poisonedTurns,
    );

    expect(poisoned.checks.legalPolarityConsistent).toBe(false);
    expect(
      poisoned.checks.concepts["low-voltage-special-education-scope"],
    ).toBe(false);
    expect(
      poisoned.checks.concepts["high-voltage-special-education-scope"],
    ).toBe(false);
    expect(poisoned.failures).toContain(
      "required legal scope is contradicted by a negative assertion",
    );
    expect(poisoned.passed).toBe(false);
  });

  it("EL-043 は『盤を開ける』を未提示のテスター測定へ膨張させる回答を失敗させる", () => {
    const evaluation = evaluateElectricChatbotHoldout();
    const testCase = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.find(
      (candidate) => candidate.id === "EL-043",
    );
    const result = evaluation.results.find(
      (candidate) => candidate.id === "EL-043",
    );
    if (!testCase || !result) throw new Error("EL-043 fixture is missing");
    expect(result.checks.noInventedAction).toBe(true);

    const poisonedTurns = result.turns.map((turn, index) =>
      index === result.turns.length - 1
        ? {
            ...turn,
            response: {
              ...turn.response,
              context: {
                ...(turn.response.context ?? {}),
                workAction: "open-panel" as const,
              },
              directAnswer:
                "盤を開けてテスターを当てる作業は、見るだけではありません。［1］",
              clarificationQuestion:
                "測定時は充電中で、電圧は100Vですか？",
            },
          }
        : turn,
    );
    const poisoned = evaluateElectricHoldoutCaseFromTurns(
      testCase,
      poisonedTurns,
    );

    expect(poisoned.checks.noInventedAction).toBe(false);
    expect(poisoned.failures).toContain(
      "an unconfirmed electrical action was asserted as fact",
    );
  });

  it("EL-047 frozen期待値の危険な目視推定を補正し、否定条件と残る分岐を必須化する", () => {
    const evaluation = evaluateElectricChatbotHoldout();
    const testCase = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.find(
      (candidate) => candidate.id === "EL-047",
    );
    const result = evaluation.results.find(
      (candidate) => candidate.id === "EL-047",
    );
    if (!testCase || !result) throw new Error("EL-047 fixture is missing");
    expect(result.fixtureSafetyCorrection?.frozenExpectedAction).toBe(
      "visual-inspection",
    );
    expect(result.fixtureSafetyCorrection?.enforcedExpectedAction).toBe(
      "unknown",
    );
    expect(result.checks.negativeConstraintRetained).toBe(true);

    const poisonedTurns = result.turns.map((turn, index) =>
      index === result.turns.length - 1
        ? {
            ...turn,
            response: {
              ...turn.response,
              context: {
                topicDomain: "electrical" as const,
                workAction: "visual-inspection" as const,
                equipment: "電気設備",
              },
              directAnswer:
                "配線を触らないので、盤外から見るだけの点検です。［1］",
              importantConditions: [],
            },
          }
        : turn,
    );
    const poisoned = evaluateElectricHoldoutCaseFromTurns(
      testCase,
      poisonedTurns,
    );

    expect(poisoned.checks.negativeConstraintRetained).toBe(false);
    expect(poisoned.failures).toContain(
      "negative wiring constraint was converted into an unsafe positive action",
    );
    expect(poisoned.failures).toContain(
      "workAction expected=unknown actual=visual-inspection",
    );
  });

  it.each([
    {
      id: "EL-008",
      lawShort: "特別教育規程",
      article: "第5条",
      poisonedParagraph: "第1項・第2項・第3項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 高圧・特別高圧の充電電路等の敷設、点検、修理又は操作",
      expectedFailure: "unsupported legal claim high-voltage-education-hours",
    },
    {
      id: "EL-008",
      lawShort: "特別教育規程",
      article: "第6条",
      poisonedParagraph: "第1項・第2項・第3項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 低圧の充電電路の敷設・修理と露出充電部付き開閉器の操作",
      expectedFailure: "unsupported legal claim low-voltage-education-hours",
    },
    {
      id: "EL-002",
      lawShort: "電気工事士法",
      article: "第2条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 この法律において一般用電気工作物等の範囲を定める。",
      expectedFailure:
        "required authority source unit is unsupported: 電気工事士法第2条",
    },
    {
      id: "EL-018",
      lawShort: "安衛則",
      article: "第339条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 事業者は、電路を開路して電気工事の作業を行うときは措置を講じる。",
      expectedFailure:
        "required authority source unit is unsupported: 安衛則第339条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第346条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 事業者は、低圧の充電電路の点検、修理等当該充電電路を取り扱う作業を行なう場合において、当該作業に従事する労働者について感電の危険が生ずるおそれのあるときは、当該労働者に絶縁用保護具を着用させなければならない。",
      expectedFailure:
        "unsupported low-voltage tester source unit: 安衛則第346条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第346条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 事業者は、低圧の充電電路の点検、修理等当該充電電路を取り扱う作業を行なう場合において、当該作業に従事する労働者について感電の危険が生ずるおそれのあるときは、当該労働者に活線作業用器具を使用させなければならない。",
      expectedFailure:
        "unsupported low-voltage tester source unit: 安衛則第346条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第347条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 事業者は、低圧の充電電路に近接する場所で電路又はその支持物の敷設、点検、修理、塗装等の電気工事の作業を行なう場合において、当該作業に従事する労働者が当該充電電路に接触することにより感電の危険が生ずるおそれのあるときは、当該充電電路に絶縁用防具を装着しなければならない。",
      expectedFailure:
        "unsupported low-voltage tester source unit: 安衛則第347条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第347条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 ただし、労働者に絶縁用保護具を着用させ、着用する身体の部分以外が充電電路に接触するおそれのないときは、この限りでない。",
      expectedFailure:
        "unsupported low-voltage tester source unit: 安衛則第347条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第354条",
      poisonedParagraph: undefined,
      poisonedItem: undefined,
      poisonedEvidence:
        "この章の規定は、電気機械器具、配線又は移動電線については適用しない。",
      expectedFailure:
        "unsupported low-voltage tester source unit: 安衛則第354条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第339条",
      poisonedParagraph: "第1項",
      poisonedItem: "第1号・第2号・第3号",
      poisonedEvidence:
        "第1号 開路に用いた開閉器に施錠し、通電禁止を表示し、又は監視人を置く。第3号 高圧又は特別高圧では検電器具で確認し、短絡接地する。",
      expectedFailure:
        "unsupported de-energized source unit: 安衛則第339条",
    },
    {
      id: "EL-053",
      lawShort: "安衛則",
      article: "第339条",
      poisonedParagraph: "第1項",
      poisonedItem: "第1号・第2号・第3号",
      poisonedEvidence:
        "第1号 開閉器に施錠し、通電禁止を表示し、又は監視人を置く。第2号 残留電荷による危険がある電路は確実に放電する。第3号 高圧又は特別高圧では検電器具で確認し、短絡接地する。",
      expectedFailure:
        "unsupported de-energized source unit: 安衛則第339条",
    },
    {
      id: "EL-013",
      lawShort: "安衛則",
      article: "第347条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 低圧の充電電路に近接して接触のおそれがある場合は絶縁用防具を装着する。",
      expectedFailure:
        "unsupported legal claim low-voltage-proximity-exception",
    },
    {
      id: "EL-013",
      lawShort: "安衛則",
      article: "第344条",
      poisonedParagraph: "第1項",
      poisonedItem: undefined,
      poisonedEvidence:
        "第1項 特別高圧の充電電路について事業者が措置を講じる。",
      expectedFailure:
        "unsupported legal claim extra-high-live-and-proximity-work",
    },
    {
      id: "EL-003",
      lawShort: "電気工事士法",
      article: "第3条",
      poisonedParagraph: "第1項・第2項・第3項・第4項",
      poisonedItem: undefined,
      poisonedEvidence: "第1項 電気工事士の資格制度を定める。",
      expectedFailure:
        "unsupported legal claim chief-engineer-does-not-replace-worker-requirements",
    },
    {
      id: "EL-016",
      lawShort: "安衛則",
      article: "第36条",
      poisonedParagraph: undefined,
      poisonedItem: "第4号",
      poisonedEvidence:
        "第4号 低圧の充電電路の敷設・修理と露出充電部付き開閉器の操作",
      expectedFailure: "unsupported legal claim 100v-is-low-voltage",
    },
  ])(
    "$id の $lawShort$article はURL・markerだけ正しくても命題対応抜粋が欠ければ失敗する",
    ({
      id,
      lawShort,
      article,
      poisonedParagraph,
      poisonedItem,
      poisonedEvidence,
      expectedFailure,
    }) => {
      const evaluation = evaluateElectricChatbotHoldout();
      const testCase = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.find(
        (candidate) => candidate.id === id,
      );
      const result = evaluation.results.find((candidate) => candidate.id === id);
      if (!testCase || !result) throw new Error(`${id} fixture is missing`);
      expect(result.passed).toBe(true);

      const finalTurn = result.turns.at(-1)!;
      const sourceIndex = finalTurn.response.sources.findIndex(
        (source) =>
          source.lawShort === lawShort && source.article.startsWith(article),
      );
      expect(sourceIndex).toBeGreaterThanOrEqual(0);
      const marker = `［${sourceIndex + 1}］`;
      expect(
        [
          finalTurn.response.directAnswer,
          ...finalTurn.response.importantConditions,
        ].join(" "),
      ).toContain(marker);

      const poisonedTurns = result.turns.map((turn, index) =>
        index === result.turns.length - 1
          ? {
              ...turn,
              response: {
                ...turn.response,
                sources: turn.response.sources.map((source, sourcePosition) =>
                  sourcePosition === sourceIndex
                    ? {
                        ...source,
                        paragraph: poisonedParagraph,
                        item: poisonedItem,
                        text: poisonedEvidence,
                        snippet: poisonedEvidence,
                      }
                    : source,
                ),
              },
            }
          : turn,
      );
      const poisonedSource = poisonedTurns.at(-1)!.response.sources[sourceIndex]!;
      expect(poisonedSource.url).toMatch(/^https:\/\//);
      expect(poisonedSource.verificationStatus).toBeTruthy();

      const poisoned = evaluateElectricHoldoutCaseFromTurns(
        testCase,
        poisonedTurns,
      );
      expect(poisoned.checks.citationSupport).toBe(false);
      expect(poisoned.passed).toBe(false);
      expect(poisoned.failures.join(" ")).toContain(expectedFailure);
    },
  );
});
