import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.resolve(
    process.cwd(),
    "scripts/audit/answer-first-preview-conversation-audit.mjs",
  ),
  "utf8",
).replace(/\r\n/gu, "\n");
const externalOperationsSource = readFileSync(
  path.resolve(
    process.cwd(),
    "scripts/audit/external-operations-preview-smoke.mjs",
  ),
  "utf8",
);
const previewPlaywrightConfigSource = readFileSync(
  path.resolve(process.cwd(), "playwright.preview-chatbot.config.ts"),
  "utf8",
);
const deployedBrowserHoldoutSource = readFileSync(
  path.resolve(
    process.cwd(),
    "e2e/electric-chatbot-deployed-holdout.spec.ts",
  ),
  "utf8",
);

describe("Answer-first Preview browser bridge security", () => {
  it("fails closed around one owned immutable Preview deployment", () => {
    expect(source).toContain('readArgument("deployment-id")');
    expect(source).toContain(
      'metadata.customEnvironment?.slug ?? metadata.target ?? "preview"',
    );
    expect(source).toContain('resolvedTarget !== "preview"');
    expect(source).toContain("metadata.projectId !== linkedProject.projectId");
    expect(source).toContain("deploymentId === productionDeploymentId");
    expect(source).toContain(
      'productionMetadata.target !== "production"',
    );
    expect(source).toContain(
      "productionMetadata.id !== productionDeploymentId",
    );
    expect(source).toContain('readMetadata("www.anzen-ai-portal.jp")');
    expect(source).toContain(
      "productionAliasMetadata.id !== productionDeploymentId",
    );
    expect(source).not.toContain('readArgument("deployment")');
  });

  it("requires a pre-existing secret without putting it in a child argv", () => {
    expect(source).toContain("ANSWER_FIRST_PREVIEW_BYPASS_SECRET");
    expect(source).toContain('"x-vercel-protection-bypass": protectionBypassSecret');
    expect(source).toContain('redirect: "manual"');
    expect(source).not.toContain('"--protection-bypass"');
    expect(source).not.toContain('"--location"');
  });

  it("proves GET-only safety before enabling an allowlisted POST", () => {
    expect(source).toMatch(
      /proveDeploymentProtection\(\);[\s\S]*assertGetOnlyPreviewBoundary\(\);[\s\S]*postsEnabled = true;/u,
    );
    expect(source).toContain(
      '"/api/chat",\n  "/api/chatbot",\n  "/api/chatbot/stream"',
    );
    expect(source).toContain("allowedReadPaths.has(url.pathname)");
    expect(source).toContain("allowedPublicAssetPrefixes.some");
    expect(source).toContain('server.listen(0, "127.0.0.1"');
    expect(source).toContain("loopbackAddresses.has(request.socket.remoteAddress");
  });

  it("waits through deferred enhancement gates and observes external traffic", () => {
    expect(source).toContain("await page.waitForTimeout(17_000)");
    expect(source).toContain('"safe-ai:optional-tracking-consent:v1"');
    expect(source).toContain("externalRequestCount");
    expect(source).toContain("registerAttemptCount");
    expect(source).toContain("MAX_RESPONSE_BYTES");
    expect(source).toContain("deployed-sse-stream-coverage");
    expect(source).toContain("firstChunkLatencyMs <= 30_000");
    expect(source).toContain("flushedBeforeCompletion === true");
    expect(source).toContain('ANSWER_FIRST_ROUTE_IDS: "json,legacy"');
    expect(source).toContain("legacyPostCount === 11");
    expect(source).toContain("jsonPostCount === 99");
    expect(source).toContain("streamPostCount === 101");
    expect(source).toContain("streamedPostCount === 101");
  });

  it("runs the immutable electrical fixture through JSON and real browser SSE/UI", () => {
    expect(source).toContain(
      '"e2e/electric-chatbot-deployed-holdout.spec.ts"',
    );
    expect(source).toContain("electricHoldoutBrowserEvidencePath");
    expect(source).toContain(
      'relationToElectricalHoldout: "additional fixed conversation set"',
    );
    expect(source).toContain("expandedEvidenceTurnCount === 88");
    expect(source).toContain("quickReplyAlignedTurnCount === 88");
    expect(source).toContain("rawQuestionLeakCount === 0");
    expect(deployedBrowserHoldoutSource).toContain(
      "evaluateElectricHoldoutCaseFromTurns",
    );
    expect(deployedBrowserHoldoutSource).toContain(
      "summarizeElectricHoldoutResults",
    );
    expect(deployedBrowserHoldoutSource).toContain(
      "ELECTRIC_CHATBOT_HOLDOUT_2026_08_09",
    );
    expect(deployedBrowserHoldoutSource).toContain(
      "const rawQuestionPersistedInEvidence = containsRawQuestion(",
    );
    expect(deployedBrowserHoldoutSource).toContain(
      "JSON.stringify(evidenceCandidate)",
    );
  });

  it("keeps Preview browser artifacts external and unable to capture raw input", () => {
    expect(source).toContain(
      '"--config=playwright.preview-chatbot.config.ts"',
    );
    expect(source).toContain("ANSWER_FIRST_PLAYWRIGHT_OUTPUT_DIR");
    expect(source).toContain('PLAYWRIGHT_NO_COPY_PROMPT: "1"');
    expect(previewPlaywrightConfigSource).toContain('trace: "off"');
    expect(previewPlaywrightConfigSource).toContain('video: "off"');
    expect(previewPlaywrightConfigSource).toContain('screenshot: "off"');
    expect(previewPlaywrightConfigSource).toContain('reporter: [["line"]]');
    expect(previewPlaywrightConfigSource).toContain(
      "Preview Playwright artifacts must remain outside the repository",
    );
    expect(source).not.toContain("`${playwrightResult.stdout}");
  });

  it("keeps the external-operations Preview probe on the same owned boundary", () => {
    expect(externalOperationsSource).toContain(
      'linkedProject.projectId !== "prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a"',
    );
    expect(externalOperationsSource).toContain(
      'linkedProject.orgId !== "team_fmzwEegB8SRsADNmwXkBUN34"',
    );
    expect(externalOperationsSource).toContain(
      'readDeploymentMetadata("www.anzen-ai-portal.jp")',
    );
    expect(externalOperationsSource).toContain(
      '"X-Vercel-Protection-Bypass": protectionBypassSecret',
    );
    expect(externalOperationsSource).toMatch(
      /runGetOnlyPreflight\(\);[\s\S]*runPostChecks\(\);/u,
    );
    expect(externalOperationsSource).not.toContain('"curl"');
    expect(externalOperationsSource).not.toContain('"--location"');
  });
});
