import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertProductionAliasDeployment,
  resolveRepositoryExternalEvidencePath,
  sitemapContainsLocation,
} from "../../../scripts/audit/japan-leading-production-smoke.mjs";

const LINKED_PROJECT = {
  projectId: "prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a",
  orgId: "team_fmzwEegB8SRsADNmwXkBUN34",
  projectName: "safe-ai-site",
};
const DEPLOYMENT_ID = "dpl_CurrentProduction123";
const PRODUCTION_HOSTNAME = "www.anzen-ai-portal.jp";
const IMMUTABLE_URL = "safe-ai-site-production-abc123.vercel.app";

function productionMetadata(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: DEPLOYMENT_ID,
    projectId: LINKED_PROJECT.projectId,
    ownerId: LINKED_PROJECT.orgId,
    name: LINKED_PROJECT.projectName,
    target: "production",
    readyState: "READY",
    url: IMMUTABLE_URL,
    alias: [PRODUCTION_HOSTNAME, "anzen-ai-portal.jp"],
    aliasAssigned: true,
    aliasError: null,
    ...overrides,
  };
}

function assertFixture(
  deploymentMetadata = productionMetadata(),
  aliasMetadata = productionMetadata(),
) {
  return assertProductionAliasDeployment({
    expectedDeploymentId: DEPLOYMENT_ID,
    productionHostname: PRODUCTION_HOSTNAME,
    linkedProject: LINKED_PROJECT,
    deploymentMetadata,
    aliasMetadata,
  });
}

describe("Japan-leading production deployment boundary", () => {
  it("matches exact sitemap locations without suffix collisions", () => {
    const xml = [
      "<urlset>",
      "<url><loc>https://www.anzen-ai-portal.jp/materials/safety-images/heat-illness-prevention</loc></url>",
      "</urlset>",
    ].join("");

    expect(
      sitemapContainsLocation(
        xml,
        "https://www.anzen-ai-portal.jp/",
        "/heat-illness-prevention",
      ),
    ).toBe(false);
    expect(
      sitemapContainsLocation(
        xml,
        "https://www.anzen-ai-portal.jp/",
        "/materials/safety-images/heat-illness-prevention",
      ),
    ).toBe(true);
  });

  it("requires an explicit absolute evidence path outside the repository", () => {
    const repositoryRoot = resolve("C:/safe-ai-site");
    expect(() =>
      resolveRepositoryExternalEvidencePath({
        configuredPath: undefined,
        repositoryRoot,
      }),
    ).toThrow("explicit absolute repository-external path");
    expect(() =>
      resolveRepositoryExternalEvidencePath({
        configuredPath: join(repositoryRoot, "docs", "smoke.json"),
        repositoryRoot,
      }),
    ).toThrow("outside the repository");
    const external = resolve("C:/safe-ai-release/production/smoke.json");
    expect(
      resolveRepositoryExternalEvidencePath({
        configuredPath: external,
        repositoryRoot,
      }),
    ).toBe(external);
  });

  it("accepts only when the production alias and ID resolve to the same linked deployment", () => {
    const evidence = assertFixture(
      productionMetadata({ credential: "must-not-be-copied" }),
      productionMetadata({ credential: "must-not-be-copied" }),
    );

    expect(evidence).toEqual({
      deploymentId: DEPLOYMENT_ID,
      productionHostname: PRODUCTION_HOSTNAME,
      projectId: LINKED_PROJECT.projectId,
      orgId: LINKED_PROJECT.orgId,
      target: "production",
      readyState: "READY",
      immutableUrl: IMMUTABLE_URL,
      exactAliasMatch: true,
    });
    expect(JSON.stringify(evidence)).not.toContain("must-not-be-copied");
  });

  it("accepts the current Vercel shape when the custom hostname is omitted from alias", () => {
    const evidence = assertFixture(
      productionMetadata(),
      productionMetadata({
        alias: ["safe-ai-site-kameking-labs-projects.vercel.app"],
        aliasAssigned: true,
      }),
    );

    expect(evidence.exactAliasMatch).toBe(true);
  });

  it("rejects a stale deployment ID even when its syntax and metadata are valid", () => {
    expect(() =>
      assertFixture(
        productionMetadata(),
        productionMetadata({ id: "dpl_NewerProduction456" }),
      ),
    ).toThrow("production alias metadata does not prove");
  });

  it.each([
    ["wrong project", { projectId: "prj_other" }],
    ["wrong owner", { ownerId: "team_other" }],
    ["preview target", { target: "preview" }],
    ["not ready", { readyState: "BUILDING" }],
    ["different immutable URL", { url: "different.vercel.app" }],
    ["alias assignment missing", { aliasAssigned: false }],
    ["alias assignment error", { aliasError: { code: "ALIAS_FAILED" } }],
  ])("fails closed for %s alias metadata", (_label, overrides) => {
    expect(() =>
      assertFixture(productionMetadata(), productionMetadata(overrides)),
    ).toThrow();
  });

  it("uses authenticated read-only Vercel API lookups without putting a token in argv", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "scripts",
        "audit",
        "japan-leading-production-smoke.mjs",
      ),
      "utf8",
    );

    expect(source).toContain("/v13/deployments/");
    expect(source).toContain("readDeploymentMetadata(expectedDeploymentId)");
    expect(source).toContain("readDeploymentMetadata(baseUrl.hostname)");
    expect(source).toContain("sanitizedVercelEnvironment()");
    expect(source).toContain("redactVercelSecrets(stderr)");
    expect(source).not.toContain('"--token"');
  });
});
