import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/ky-paper/ky-paper-view.tsx"),
  "utf8",
);

describe("KYから法令チャットへの作業本文引き継ぎ", () => {
  it("作業本文をURL・履歴・analyticsへ載せず一時メモリで渡す", () => {
    const handoffStart = source.indexOf("<TransientChatLink");
    const handoffEnd = source.indexOf("</TransientChatLink>", handoffStart);
    const handoff = source.slice(handoffStart, handoffEnd);

    expect(handoffStart).toBeGreaterThanOrEqual(0);
    expect(handoffEnd).toBeGreaterThan(handoffStart);
    expect(handoff).toContain("buildContextPrefill");
    expect(source).not.toMatch(/\/chatbot\?[^`"']*(?:work|q)=/u);
    expect(handoff).not.toContain("encodeURIComponent(");
    expect(handoff).not.toContain("trackEvent(");
  });
});
