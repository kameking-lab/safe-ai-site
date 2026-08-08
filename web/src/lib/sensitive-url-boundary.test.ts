import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("sensitive state URL boundary", () => {
  it("keeps safety-plan and health-checkup inputs out of generated URLs", () => {
    const plan = read("src/components/safety-plan/plan-generator-form.tsx");
    const health = read("src/components/health-checkup/scheduler-form.tsx");
    expect(plan).toContain("putSafetyPlanHandoff");
    expect(plan).not.toMatch(/params\.set\(\"(?:org|notes|focus|special|overwork)/);
    expect(health).toContain("putHealthCheckupHandoff");
    expect(health).not.toMatch(/result\?\$\{/);
    const document = read("src/components/health-checkup/scheduler-document.tsx");
    expect(document).not.toMatch(/hc-tracker[^\n]*(?:hireDate|substances|workConditions|jobIds)/);
  });

  it("does not write or share precise signage coordinates", () => {
    const source = read("src/components/signage-map/signage-map-client.tsx");
    expect(source).not.toContain('params.set("lat"');
    expect(source).not.toContain('params.set("lng"');
    expect(source).not.toContain("window.history.replaceState");
    expect(source).not.toMatch(/signage\/display\?[^"`]*(?:lat|lng|zoom)=/);
    expect(source).toContain("window.location.origin}${window.location.pathname}");
  });

  it("derives ledger and training organization scope without URL input", () => {
    for (const file of [
      "src/app/(main)/chemical-ra/ledger/page.tsx",
      "src/app/(main)/education/progress/page.tsx",
      "src/app/api/organization/chemical-ra/route.ts",
      "src/app/api/organization/chemical-ra/sds/route.ts",
      "src/app/api/organization/chemical-ra/[assessmentId]/approve/route.ts",
      "src/app/api/organization/chemical-ra/[assessmentId]/reassessment/route.ts",
      "src/app/api/organization/chemical-ra/[assessmentId]/review/route.ts",
      "src/app/api/organization/chemical-ra/[assessmentId]/versions/route.ts",
      "src/app/api/organization/training/route.ts",
      "src/app/api/organization/training/records/route.ts",
      "src/app/api/organization/training/[enrollmentId]/completion/route.ts",
    ]) {
      const source = read(file);
      expect(source).not.toMatch(/searchParams\.get\(\"(?:organization|site)\"\)/);
      expect(source).not.toMatch(/[?&](?:organization|site)=/);
      expect(source).not.toContain('get("x-organization-id")');
    }
  });

  it("hands asbestos project conditions to the next tool without a query", () => {
    const checker = read(
      "src/app/(main)/asbestos-management/investigation-checker/InvestigationCheckerForm.tsx",
    );
    const bridge = read("src/lib/asbestos-scope-query.ts");
    expect(checker).toContain("putAsbestosScopeHandoff");
    expect(checker).toContain('href="/asbestos-management/notification-builder"');
    expect(checker).not.toMatch(/notification-builder\?\$\{/);
    expect(bridge).not.toContain("asbestosScopeToQuery");
  });
});
