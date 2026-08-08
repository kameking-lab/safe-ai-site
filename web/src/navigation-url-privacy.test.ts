import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CHEMICAL_NAVIGATION_FILES = [
  "src/components/chemical-database-client.tsx",
  "src/components/chemical-ra-extras.tsx",
  "src/components/product-search-panel.tsx",
  "src/components/chemical/sds-upload-panel.tsx",
  "src/components/chemical/chemical-ra-save.tsx",
  "src/components/chemical/chemical-not-found-rescue.tsx",
  "src/components/ky-paper/ky-paper-view.tsx",
  "src/lib/chemical/work-chemical-hints.ts",
  "src/app/(main)/chemical-ra/page.tsx",
] as const;

describe("cross-feature URL privacy", () => {
  it("化学自由入力の導線をname/query付きURLとして生成しない", () => {
    for (const file of CHEMICAL_NAVIGATION_FILES) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/\/chemical-ra\?(?:name|query|substance|product)=/u);
      expect(source, file).not.toContain("`/chemical-ra?${");
    }
  });

  it("Copilotの質問本文をchatbot URLへ生成しない", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/copilot/CopilotNextSteps.tsx"),
      "utf8",
    );
    expect(source).not.toContain("/chatbot?q=");
    expect(source).not.toContain("href: `/chatbot${");
    expect(source).not.toContain("encodeURIComponent(concerns[0])");
    expect(source).toContain("TransientChatLink");
  });

  it("一時引継ぎリンクのhrefは固定routeだけを使う", () => {
    const chemicalLink = readFileSync(
      resolve(
        process.cwd(),
        "src/components/home-safety-cockpit/transient-chemical-link.tsx",
      ),
      "utf8",
    );
    const chatLink = readFileSync(
      resolve(
        process.cwd(),
        "src/components/home-safety-cockpit/transient-chat-link.tsx",
      ),
      "utf8",
    );
    expect(chemicalLink).toContain('href="/chemical-ra"');
    expect(chatLink).toContain('href="/chatbot"');
    expect(chemicalLink).not.toContain("URLSearchParams");
    expect(chatLink).not.toContain("URLSearchParams");

    const sdsUpload = readFileSync(
      resolve(process.cwd(), "src/components/chemical/sds-upload-panel.tsx"),
      "utf8",
    );
    expect(sdsUpload).not.toContain("/chemical-database/${");
  });
});
