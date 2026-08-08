import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postJson } from "@/app/api/chatbot/route";
import { POST as postStream } from "@/app/api/chatbot/stream/route";
import {
  LEGAL_RAG_EVALUATION_2026_08_02,
  LEGAL_RAG_EVALUATION_EXPECTED_COUNTS,
  LEGAL_RAG_EVALUATION_FROZEN_AT,
} from "@/data/legal-rag-evaluation-2026-08-02";
import {
  buildLegalClarification,
  resolveLegalConversationQuery,
} from "@/lib/legal-conversation-context";
import {
  evaluateLegalRagDataset,
  legalEvaluationChecksum,
  legalRagEvaluationCsv,
} from "@/lib/legal-rag-evaluation-2026-08-02";
import { buildServiceFirstLegalAnswer } from "@/lib/legal-extractive-answer";

const expectedChecksum = readFileSync(
  resolve(
    process.cwd(),
    "src/data/legal-rag-evaluation-2026-08-02.sha256",
  ),
  "utf8",
).trim();

type SafetyRoutePayload = {
  answer?: string;
  safetyKind?: string;
};

async function readSafetyPayload(
  response: Response,
  mode: "json" | "sse",
): Promise<SafetyRoutePayload> {
  expect(response.status).toBe(200);
  const raw = await response.text();
  if (mode === "json") return JSON.parse(raw) as SafetyRoutePayload;
  const payloads = [...raw.matchAll(/^data: ([^\n]+)$/gm)]
    .map((match) => {
      try {
        return JSON.parse(match[1] ?? "") as SafetyRoutePayload;
      } catch {
        return null;
      }
    })
    .filter((payload): payload is SafetyRoutePayload => payload !== null);
  const safetyPayload = payloads.find((payload) => payload.safetyKind);
  if (!safetyPayload) throw new Error("SSE safety payload was not emitted");
  return safetyPayload;
}

describe("2026-08-02 legal RAG frozen evaluation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("freezes exactly 220 independently reviewed cases and category counts", () => {
    expect(LEGAL_RAG_EVALUATION_2026_08_02).toHaveLength(
      LEGAL_RAG_EVALUATION_EXPECTED_COUNTS.total,
    );
    for (const [category, expected] of Object.entries(
      LEGAL_RAG_EVALUATION_EXPECTED_COUNTS,
    )) {
      if (category === "total") continue;
      expect(
        LEGAL_RAG_EVALUATION_2026_08_02.filter(
          (testCase) => testCase.category === category,
        ),
        category,
      ).toHaveLength(expected);
    }
    expect(
      new Set(LEGAL_RAG_EVALUATION_2026_08_02.map(({ id }) => id)).size,
    ).toBe(LEGAL_RAG_EVALUATION_EXPECTED_COUNTS.total);
    expect(
      LEGAL_RAG_EVALUATION_2026_08_02.every(
        ({ query, turns }) => Boolean(query) !== Boolean(turns),
      ),
    ).toBe(true);
    expect(
      LEGAL_RAG_EVALUATION_2026_08_02.filter(
        ({ category }) => category === "ambiguous",
      ).every(({ expected }) => (expected.choices?.length ?? 0) <= 3),
    ).toBe(true);
  });

  it("matches the frozen canonical checksum", () => {
    expect(legalEvaluationChecksum(LEGAL_RAG_EVALUATION_2026_08_02)).toBe(
      expectedChecksum,
    );
  });

  it("counts an emitted unsupported answer as dangerous but keeps a safe abstention at zero", async () => {
    const exactCase = LEGAL_RAG_EVALUATION_2026_08_02.find(
      ({ id }) => id === "exact-01",
    );
    const pastCase = LEGAL_RAG_EVALUATION_2026_08_02.find(
      ({ id }) => id === "temporal-11",
    );
    expect(exactCase).toBeDefined();
    expect(pastCase).toBeDefined();

    const unsupported = await evaluateLegalRagDataset({
      cases: [exactCase!],
      frozenAt: LEGAL_RAG_EVALUATION_FROZEN_AT,
      now: new Date("2026-08-02T00:00:00+09:00"),
      adapters: {
        buildAnswer: () =>
          [
            "結論",
            "この条文により、すべての作業が安全です。［1］",
            "",
            "条件",
            "・追加条件はありません。［1］",
            "",
            "根拠",
            "・安衛法第1条［1］",
            "",
            "適用時点",
            "・現在施行中［1］",
            "",
            "次の質問",
            "ほかに確認しますか？",
          ].join("\n"),
      },
    });
    expect(unsupported.cases[0]).toMatchObject({
      actualDisposition: "answer",
      citationSupported: false,
      dangerousMiss: true,
      passed: false,
    });
    expect(unsupported.metrics.dangerousMisses).toBe(1);

    const qualificationCase = LEGAL_RAG_EVALUATION_2026_08_02.find(
      ({ id }) => id === "colloquial-07",
    );
    expect(qualificationCase).toBeDefined();
    const hiddenContradiction = await evaluateLegalRagDataset({
      cases: [qualificationCase!],
      frozenAt: LEGAL_RAG_EVALUATION_FROZEN_AT,
      now: new Date("2026-08-02T00:00:00+09:00"),
      adapters: {
        buildAnswer: ({ query, articles, now }) =>
          buildServiceFirstLegalAnswer({ query, articles, now }).replace(
            "結論\n",
            "結論\nフォークリフトは無資格で運転できます。 ",
          ),
      },
    });
    expect(hiddenContradiction.cases[0]).toMatchObject({
      actualDisposition: "answer",
      citationSupported: false,
      dangerousMiss: true,
      passed: false,
    });
    expect(hiddenContradiction.metrics.dangerousMisses).toBe(1);

    const safeHold = await evaluateLegalRagDataset({
      cases: [pastCase!],
      frozenAt: LEGAL_RAG_EVALUATION_FROZEN_AT,
      now: new Date("2026-08-02T00:00:00+09:00"),
    });
    expect(safeHold.cases[0]).toMatchObject({
      actualDisposition: "abstain",
      dangerousMiss: false,
    });
    expect(safeHold.metrics.dangerousMisses).toBe(0);
  });

  it.each([
    ["colloquial-07", "資格区分は車体重量で決まりますが、"],
    ["colloquial-10", "玉掛けの区分は実際の荷の重さで決まりますが、"],
    ["colloquial-55", "雇い入れ時教育は正社員だけが対象ですが、"],
  ])(
    "canonical回答と同一文に混ぜた未審査前置き主張を危険な見逃しとして数える: %s",
    async (id, falsePremise) => {
      const testCase = LEGAL_RAG_EVALUATION_2026_08_02.find(
        (candidate) => candidate.id === id,
      );
      expect(testCase).toBeDefined();
      const report = await evaluateLegalRagDataset({
        cases: [testCase!],
        frozenAt: LEGAL_RAG_EVALUATION_FROZEN_AT,
        now: new Date("2026-08-02T00:00:00+09:00"),
        adapters: {
          buildAnswer: ({ query, articles, now }) =>
            buildServiceFirstLegalAnswer({ query, articles, now }).replace(
              "結論\n",
              `結論\n${falsePremise}`,
            ),
        },
      });

      expect(report.cases[0]).toMatchObject({
        actualDisposition: "answer",
        citationSupported: false,
        dangerousMiss: true,
        passed: false,
      });
      expect(report.metrics.dangerousMisses).toBe(1);
    },
  );

  it("keeps a context-resolved answer substantive when a clarification is also available", async () => {
    const exactCase = LEGAL_RAG_EVALUATION_2026_08_02.find(
      ({ id }) => id === "exact-01",
    );
    expect(exactCase).toBeDefined();
    const buildClarification = vi.fn((message: string) =>
      message === "労働安全衛生法第1条を示してください。"
        ? { question: "確認対象はどれですか？", options: ["目的", "定義"] }
        : null,
    );

    const report = await evaluateLegalRagDataset({
      cases: [
        {
          ...exactCase!,
          query: undefined,
          turns: ["労働安全衛生法について", "第1条は？"],
        },
      ],
      frozenAt: LEGAL_RAG_EVALUATION_FROZEN_AT,
      now: new Date("2026-08-02T00:00:00+09:00"),
      adapters: {
        resolveConversationQuery: () => ({
          query: "労働安全衛生法第1条を示してください。",
          usedHistory: true,
        }),
        buildClarification,
      },
    });

    expect(buildClarification).toHaveBeenCalledWith(
      "労働安全衛生法第1条を示してください。",
    );
    expect(buildClarification).not.toHaveBeenCalledWith("第1条は？");
    expect(report.cases[0]).toMatchObject({
      expectedDisposition: "answer",
      actualDisposition: "answer",
      passed: true,
      dangerousMiss: false,
      failureCodes: [],
    });
  });

  it(
    "measures retrieval, grounding, ambiguity, temporal and safety targets",
    { timeout: 120_000 },
    async () => {
      vi.stubEnv("GEMINI_API_KEY", "external-provider-boundary-test-key");
      const fetchSpy = vi.fn(async () => {
        throw new Error("provider call must not occur for blocked input");
      });
      vi.stubGlobal("fetch", fetchSpy);
      const report = await evaluateLegalRagDataset({
        cases: LEGAL_RAG_EVALUATION_2026_08_02,
        frozenAt: LEGAL_RAG_EVALUATION_FROZEN_AT,
        now: new Date("2026-08-02T00:00:00+09:00"),
        adapters: {
          resolveConversationQuery: resolveLegalConversationQuery,
          buildClarification: buildLegalClarification,
          probeExternalBoundary: async ({
            message,
            expectedDisposition,
          }) => {
            const callsBefore = fetchSpy.mock.calls.length;
            const routes = [
              { post: postJson, mode: "json" as const },
              { post: postStream, mode: "sse" as const },
            ];
            const payloads: SafetyRoutePayload[] = [];
            for (const route of routes) {
              const response = await route.post(
                new Request("http://localhost/api/chatbot", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    message,
                    privacyConfirmed: true,
                  }),
                }),
              );
              payloads.push(await readSafetyPayload(response, route.mode));
            }
            return {
              providerCalled: fetchSpy.mock.calls.length > callsBefore,
              dispositionCorrect: payloads.every(
                ({ safetyKind }) => safetyKind === expectedDisposition,
              ),
              routesChecked: payloads.length,
            };
          },
        },
      });

      const outPath = resolve(
        process.cwd(),
        "../docs/audits/legal-rag-evaluation-2026-08-02.csv",
      );
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, legalRagEvaluationCsv(report), "utf8");

      const summaryPath = resolve(
        process.cwd(),
        "../docs/audits/evidence/service-first-copy-reduction-2026-08-02/legal-rag-evaluation-summary.json",
      );
      mkdirSync(dirname(summaryPath), { recursive: true });
      writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            evaluatedAt: report.evaluatedAt,
            frozenAt: report.frozenAt,
            checksum: report.checksum,
            counts: report.counts,
            metrics: report.metrics,
            failedIds: report.cases
              .filter(({ passed }) => !passed)
              .map(({ id, failureCodes }) => ({ id, failureCodes })),
          },
          null,
          2,
        ) + "\n",
        "utf8",
      );

      expect(report.checksum).toBe(expectedChecksum);
      const falseClarifications = report.cases.filter(
        ({ expectedDisposition, actualDisposition }) =>
          expectedDisposition === "answer" && actualDisposition === "clarify",
      );
      expect(falseClarifications.map(({ id }) => id)).toEqual([]);
      expect(
        falseClarifications.every(({ failureCodes, dangerousMiss }) =>
          failureCodes.includes("false-clarification") && !dangerousMiss,
        ),
      ).toBe(true);
      const ladderClarification = report.cases.find(
        ({ id }) => id === "ambiguous-07",
      );
      expect(ladderClarification).toMatchObject({
        actualDisposition: "clarify",
        clarificationCorrect: true,
        clarificationChoicesMatch: true,
        clarificationSlotMatch: true,
        actualClarificationSlot: "height",
        passed: true,
        failureCodes: [],
      });
      const frozenPastCases = report.cases.filter(
        ({ id }) => /^temporal-(?:1[1-9]|20)$/.test(id),
      );
      expect(frozenPastCases).toHaveLength(10);
      expect(
        frozenPastCases.every(
          ({
            actualDisposition,
            historicalSourceVerified,
            temporalCorrect,
            passed,
            failureCodes,
          }) =>
            actualDisposition === "abstain" &&
            historicalSourceVerified === false &&
            temporalCorrect === true &&
            passed === false &&
            failureCodes.includes("historical-source-unavailable"),
        ),
      ).toBe(true);
      expect(report.metrics.exactLawArticleMrr).toBe(1);
      expect(report.metrics.colloquialRecallAt5).toBeGreaterThanOrEqual(0.95);
      expect(report.metrics.citationSupport).toBeGreaterThanOrEqual(0.95);
      expect(report.metrics.temporalAccuracy).toBe(1);
      expect(report.metrics.clarificationCorrectness).toBe(1);
      expect(report.metrics.abstentionPrecision).toBe(1);
      expect(report.metrics.dangerousMisses).toBe(0);
      expect(report.metrics.piiExternalOutbound).toBe(0);
      expect(report.metrics.emergencyExternalOutbound).toBe(0);
      expect(report.metrics.externalBoundaryCoverage).toBe(1);
      expect(report.metrics.emergencyNormalAnswerRate).toBe(0);
    },
  );
});
