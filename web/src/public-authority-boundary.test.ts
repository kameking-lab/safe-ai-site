import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_RUNTIME_FILES = [
  "src/components/footer.tsx",
  "src/components/SupervisorByline.tsx",
  "src/components/json-ld.tsx",
  "src/components/seo/keyword-landing-view.tsx",
  "src/components/seo/keyword-landing-jsonld.tsx",
  "src/components/education-pack/edu-slide-deck.tsx",
  "src/data/education-curriculum/disclaimers.ts",
  "src/data/education-context.ts",
  "src/data/features-catalog.ts",
  "src/app/(main)/leaflet/LeafletPrintView.tsx",
  "src/app/(main)/education/EducationContent.tsx",
  "src/app/(main)/features/print/print-features-client.tsx",
  "src/app/(main)/guides/page.tsx",
  "src/app/(main)/education/pack/[slug]/page.tsx",
  "src/app/(main)/education/pack/terms/page.tsx",
  "src/app/(main)/safety-ai/page.tsx",
  "src/app/(main)/contact/InquiryForm.tsx",
  "src/app/(main)/industries/[industry]/page.tsx",
  "src/components/chemical-database-client.tsx",
] as const;

describe("公開画面の権威・監修表示境界", () => {
  it("公開検証できない登録番号・非標準資格名を出さない", () => {
    const violations = PUBLIC_RUNTIME_FILES.flatMap((file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      return /260022|厚労省安全コンサルタント/.test(source) ? [file] : [];
    });
    expect(violations).toEqual([]);
  });

  it("資格を根拠にしたPerson JSON-LDを公開しない", () => {
    const files = [
      "src/components/json-ld.tsx",
      "src/components/seo/keyword-landing-jsonld.tsx",
      "src/app/(main)/safety-ai/page.tsx",
    ];
    const violations = files.flatMap((file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      return /"@type":\s*"Person"[\s\S]{0,500}労働安全コンサルタント/.test(
        source,
      )
        ? [file]
        : [];
    });
    expect(violations).toEqual([]);
  });

  it("公開確認できない資格・監修を運営者の権威として表示しない", () => {
    const violations = PUBLIC_RUNTIME_FILES.flatMap((file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      return /licensed labor safety consultant|労働安全コンサルタント(?:（土木）)?の資格を持つ|労働安全コンサルタントによる(?:専門)?解説/.test(
        source,
      )
        ? [file]
        : [];
    });
    expect(violations).toEqual([]);
  });
});
