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
