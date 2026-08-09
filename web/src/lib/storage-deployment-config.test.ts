import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  git?: { deploymentEnabled?: Record<string, boolean> };
  ignoreCommand?: string;
};

const repoRoot = resolve(process.cwd(), "..");

function readConfig(path: string): VercelConfig {
  return JSON.parse(readFileSync(path, "utf8")) as VercelConfig;
}

describe("storage-gated deployment configuration", () => {
  it("disables candidate deployments without suppressing the same SHA on main", () => {
    const configs = [
      readConfig(resolve(repoRoot, "vercel.json")),
      readConfig(resolve(process.cwd(), "vercel.json")),
    ];

    for (const config of configs) {
      expect(config.git?.deploymentEnabled).toEqual({
        "automation/storage-gate/*": false,
      });
    }

    const ignoreScript = readFileSync(
      resolve(process.cwd(), "scripts/vercel-ignore-build.sh"),
      "utf8",
    );
    expect(ignoreScript).not.toContain("VERCEL_GIT_COMMIT_REF");
    expect(ignoreScript).not.toContain("automation/storage-gate");
    expect(ignoreScript.trimEnd()).toMatch(/exit 1$/u);
  });

  it("separates read-only generation from frozen write-token promotion", () => {
    const workflows = [
      "jma-data-update.yml",
      "news-feed-daily.yml",
      "etl-egov-revisions.yml",
      "etl-mhlw-monthly.yml",
    ];

    for (const workflow of workflows) {
      const source = readFileSync(
        resolve(repoRoot, ".github/workflows", workflow),
        "utf8",
      ).replace(/\r\n/gu, "\n");
      expect(source).not.toContain("workflow_dispatch:");
      expect(source).toContain("repository_dispatch:");
      expect(source).not.toContain("git show HEAD:");
      expect(source).toContain("permissions:\n  contents: read");
      expect(source.match(/contents: write/gu)).toHaveLength(1);
      expect(source).toContain("actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02");
      expect(source).toContain("actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093");
      expect(source).toContain("artifact_name: ${{ steps.artifact.outputs.name }}");
      expect(source).toMatch(/name: \$\{\{ needs\.(fetch|refresh)\.outputs\.artifact_name \}\}/u);
      expect(source).toContain("ref: ${{ needs.");
      expect(source).toContain("EXPECTED_BASE_SHA: ${{ needs.");
      expect(source).toContain("promote-storage-artifact.sh");
      expect(source).toContain("realpath -e --");
    }

    const promotion = readFileSync(
      resolve(repoRoot, "scripts/maintenance/promote-storage-artifact.sh"),
      "utf8",
    );
    const push = readFileSync(
      resolve(repoRoot, "scripts/maintenance/push-with-storage-gate.sh"),
      "utf8",
    );
    expect(promotion).toContain("export GIT_NO_REPLACE_OBJECTS=1");
    expect(promotion).toContain('git rev-parse HEAD)" != "$expected_base"');
    expect(promotion).toContain("Artifact contains a path outside the exact allowlist");
    expect(push).toContain("export GIT_NO_REPLACE_OBJECTS=1");
    expect(push).toContain('git diff --name-only -z "$expected_base" "$candidate_sha"');
    expect(push).not.toContain("$remote_tracking_ref...HEAD");
    expect(push).not.toContain("git ls-tree HEAD");
  });

  it("validates the trusted PR merge ref without relying on an optional webhook SHA", () => {
    const source = readFileSync(
      resolve(repoRoot, ".github/workflows/storage-budget.yml"),
      "utf8",
    ).replace(/\r\n/gu, "\n");

    expect(source).toContain("pull_request_target:");
    expect(source).not.toMatch(/\n  pull_request:\n/u);
    expect(source).not.toContain("merge_commit_sha");
    expect(source).toContain(
      "format('refs/pull/{0}/merge', github.event.pull_request.number)",
    );
    expect(source).toContain(
      'read -r actual parent_one parent_two extra <<< "$(git rev-list --parents -n 1 HEAD)"',
    );
    expect(source).toContain(
      "Inspected PR merge parents do not match the immutable event base and head.",
    );
    expect(source).toContain(
      "TARGET_SHA: ${{ github.event_name == 'pull_request_target' && github.event.pull_request.head.sha || inputs.target_sha }}",
    );
  });
});
