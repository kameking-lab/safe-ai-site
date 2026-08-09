import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ELECTRIC_CHATBOT_HOLDOUT_2026_08_09 } from "@/data/electric-chatbot-holdout-2026-08-09";
import type { ChatbotResponse } from "@/lib/chatbot-contract";
import {
  electricHoldoutInitialContext,
  evaluateElectricHoldoutCaseFromTurns,
  formatElectricHoldoutFailures,
  hasOnlySafeElectricalStructuredContext,
  summarizeElectricHoldoutResults,
  type ElectricHoldoutEvaluation,
  type ElectricHoldoutTurnResult,
} from "@/lib/electric-chatbot-holdout-evaluator";

const configuredBaseUrl = process.env.ELECTRIC_HOLDOUT_BASE_URL?.replace(
  /\/$/u,
  "",
);
const deployedDescribe = configuredBaseUrl ? describe : describe.skip;
const HOLDOUT_PATH = resolve(
  process.cwd(),
  "src/data/electric-chatbot-holdout-2026-08-09.ts",
);
const CHECKSUM_PATH = resolve(
  process.cwd(),
  "src/data/electric-chatbot-holdout-2026-08-09.sha256",
);

function isChatbotResponse(value: unknown): value is ChatbotResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatbotResponse>;
  return (
    typeof candidate.directAnswer === "string" &&
    Array.isArray(candidate.assumptions) &&
    Array.isArray(candidate.importantConditions) &&
    Array.isArray(candidate.citations) &&
    Array.isArray(candidate.quickReplies) &&
    typeof candidate.confidence === "string" &&
    Boolean(candidate.effectiveDateStatus)
  );
}

deployedDescribe("deployed electrical chatbot holdout", () => {
  it(
    "passes the frozen 72 cases through the deployed JSON API without external AI",
    async () => {
      const caseResults = [];
      let requestCount = 0;
      let cacheHitCount = 0;
      let externalAiUsedCount = 0;
      let previewModeMissingCount = 0;

      for (const testCase of ELECTRIC_CHATBOT_HOLDOUT_2026_08_09) {
        const initialContext = electricHoldoutInitialContext(testCase);
        let context: ChatbotResponse["context"] = initialContext;
        const turns: ElectricHoldoutTurnResult[] = [];

        for (const message of testCase.turns) {
          const requestBody = {
            message,
            ...(context ? { context } : {}),
            lawCategory: "all",
            privacyConfirmed: true,
          };
          expect(requestBody).not.toHaveProperty("history");
          expect(
            hasOnlySafeElectricalStructuredContext(requestBody.context ?? {}),
            `${testCase.id}: unsafe request context`,
          ).toBe(true);
          const response = await fetch(`${configuredBaseUrl}/api/chatbot`, {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
            },
            body: JSON.stringify(requestBody),
            redirect: "manual",
            signal: AbortSignal.timeout(120_000),
          });
          requestCount += 1;
          const aiUsed = response.headers.get("x-ai-used");
          const cacheHit = response.headers.get("x-cache-hit");
          if (cacheHit === "true") cacheHitCount += 1;
          if (aiUsed === "true") externalAiUsedCount += 1;
          if (response.headers.get("x-safe-ai-preview-mode") !== "dry-run") {
            previewModeMissingCount += 1;
          }

          expect(response.status, `${testCase.id}: deployed JSON status`).toBe(
            200,
          );
          expect(
            aiUsed === "false" || (aiUsed === null && cacheHit === "true"),
            `${testCase.id}: external AI use was not proven false`,
          ).toBe(true);
          expect(response.headers.get("x-safe-ai-preview-mode")).toBe(
            "dry-run",
          );

          const payload: unknown = await response.json();
          expect(isChatbotResponse(payload), `${testCase.id}: response contract`).toBe(
            true,
          );
          const chatbotResponse = payload as ChatbotResponse;
          turns.push({
            message,
            retrievalQuery: message,
            usedStructuredContext: Boolean(
              requestBody.context &&
                Object.keys(requestBody.context).length > 0,
            ),
            response: chatbotResponse,
          });
          context = chatbotResponse.context ?? context;
        }

        caseResults.push(
          evaluateElectricHoldoutCaseFromTurns(testCase, turns),
        );
      }

      const metrics = summarizeElectricHoldoutResults(caseResults);
      const evaluation: ElectricHoldoutEvaluation = {
        basisDate: "2026-08-09",
        fixtureContext: "classifier-first-with-explicit-context-fixtures",
        results: caseResults,
        metrics,
      };
      const report = formatElectricHoldoutFailures(evaluation);
      const failed = caseResults.filter((result) => !result.passed);
      const expectedChecksum = (await readFile(CHECKSUM_PATH, "utf8"))
        .trim()
        .split(/\s+/u)[0]!;
      const actualChecksum = createHash("sha256")
        .update(await readFile(HOLDOUT_PATH))
        .digest("hex");

      const outputPath = process.env.ELECTRIC_HOLDOUT_EVIDENCE_PATH
        ? resolve(process.env.ELECTRIC_HOLDOUT_EVIDENCE_PATH)
        : null;
      if (outputPath) {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(
          outputPath,
          `${JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              baseUrl: configuredBaseUrl,
              route: "deployed-json-api",
              fixture: {
                id: "electric-chatbot-holdout-2026-08-09",
                checksumSha256: actualChecksum,
                checksumUnchanged: actualChecksum === expectedChecksum,
                caseCount: 72,
                turnCount: 88,
              },
              requestCount,
              cacheHitCount,
              externalAiUsedCount,
              previewModeMissingCount,
              metrics,
              failures: failed.map((result) => ({
                id: result.id,
                failures: result.failures,
              })),
              passed: failed.length === 0,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }

      expect(actualChecksum).toBe(expectedChecksum);
      expect(requestCount).toBe(88);
      expect(externalAiUsedCount).toBe(0);
      expect(previewModeMissingCount).toBe(0);
      expect(failed, report).toHaveLength(0);
      expect(metrics).toMatchObject({
        totalCases: 72,
        passedCases: 72,
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
    },
    15 * 60_000,
  );
});
