import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowDirectory = resolve(process.cwd(), "../.github/workflows");
const pinnedNodeVersion = "22.23.2";

function readWorkflow(fileName: string) {
  return readFileSync(resolve(workflowDirectory, fileName), "utf8");
}

function jobBody(workflow: string, jobName: string) {
  const normalizedWorkflow = workflow.replaceAll("\r\n", "\n");
  const marker = `  ${jobName}:\n`;
  const jobStart = normalizedWorkflow.indexOf(marker);

  expect(jobStart, `expected workflow job ${jobName}`).toBeGreaterThanOrEqual(
    0,
  );
  const remainder = normalizedWorkflow.slice(jobStart + marker.length);
  const nextJobStart = remainder.search(/^  [^ \n]+:\n/m);
  return nextJobStart === -1 ? remainder : remainder.slice(0, nextJobStart);
}

function stepBody(job: string, stepName: string) {
  const normalizedJob = job.replaceAll("\r\n", "\n");
  const marker = `      - name: ${stepName}\n`;
  const stepStart = normalizedJob.indexOf(marker);

  expect(stepStart, `expected workflow step ${stepName}`).toBeGreaterThanOrEqual(
    0,
  );
  const remainder = normalizedJob.slice(stepStart + marker.length);
  const nextStepStart = remainder.search(/^      - name: /m);
  return nextStepStart === -1 ? remainder : remainder.slice(0, nextStepStart);
}

describe("GitHub workflow runtime contract", () => {
  it("pins every web CI job to the supported Node runtime", () => {
    const workflow = readWorkflow("web-ci.yml");
    const configuredVersions = [
      ...workflow.matchAll(/node-version: "([^"]+)"/g),
    ].map(([, version]) => version);

    expect(configuredVersions).toEqual([pinnedNodeVersion, pinnedNodeVersion]);
  });

  it("allows at least 35 minutes for the cold full web CI run", () => {
    const fullJob = jobBody(readWorkflow("web-ci.yml"), "full");
    const timeout = fullJob.match(/timeout-minutes: (\d+)/);

    expect(timeout, "expected full job timeout-minutes").not.toBeNull();
    expect(Number(timeout![1])).toBeGreaterThanOrEqual(35);
  });

  it("builds and runs the full E2E suite against immutable production output", () => {
    const e2eJob = jobBody(readWorkflow("e2e.yml"), "e2e");
    const buildStep = stepBody(e2eJob, "Build");
    const strictCspStep = stepBody(e2eJob, "Verify production strict CSP");
    const fullE2eStep = stepBody(e2eJob, "Run E2E tests");

    expect(buildStep).toContain('NEXT_PUBLIC_API_MODE: "live"');
    expect(buildStep).toContain(
      'NEXT_PUBLIC_SUPABASE_URL: "https://playwright.invalid"',
    );
    expect(strictCspStep).toContain("PLAYWRIGHT_SERVER_MODE: production");
    expect(fullE2eStep).toContain("PLAYWRIGHT_SERVER_MODE: production");
    expect(fullE2eStep).toContain("run: npm run test:e2e:ci");
  });

  it.each(["etl-mhlw-monthly.yml", "etl-egov-revisions.yml"])(
    "pins %s to the web npm runtime",
    (fileName) => {
      const workflow = readWorkflow(fileName);

      expect(workflow).toContain("run: npm ci");
      expect(workflow.match(/node-version: "([^"]+)"/g)).toEqual([
        `node-version: "${pinnedNodeVersion}"`,
      ]);
    },
  );
});
