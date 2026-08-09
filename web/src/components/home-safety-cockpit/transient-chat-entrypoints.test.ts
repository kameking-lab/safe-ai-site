import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("sitewide chatbot memory handoff entrypoints", () => {
  it.each([
    ["law-search", "src/components/law-search-panel.tsx"],
    ["qualification finder", "src/app/(main)/education-certification/finder/CertFinderClient.tsx"],
    ["chemical", "src/components/chemical-ra-panel.tsx"],
    ["accident", "src/components/accidents-reports/hub-filter.tsx"],
    ["KY", "src/components/ky-paper/ky-paper-view.tsx"],
  ])("%s入口はraw questionをURLへ入れない共通linkを使う", (_label, path) => {
    const value = source(path);
    expect(value).toContain("TransientChatLink");
    expect(value).toContain("<TransientChatLink");
    expect(value).not.toMatch(/href=\{?`?\/chatbot\?(?:q|query|question)=/u);
  });

  it("home quick inputはstage後・router.push前にdata-free capabilityをarmする", () => {
    const value = source(
      "src/components/home-safety-cockpit/home-chat-quick-ask.tsx",
    );
    const stage = value.indexOf("stageChatQuestion(normalized)");
    const arm = value.indexOf("beginTransientChatNavigation()", stage);
    const navigate = value.indexOf('router.push("/chatbot")', arm);
    expect(stage).toBeGreaterThanOrEqual(0);
    expect(arm).toBeGreaterThan(stage);
    expect(navigate).toBeGreaterThan(arm);
    expect(value).not.toMatch(/(?:localStorage|sessionStorage|[?#](?:q|query|question)=)/u);
  });
});
