import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const USER_TEXT_AI_CLIENTS = [
  ["components/ky-paper/ky-paper-view.tsx", "/api/ky/suggest"],
  ["components/construction-calc/calc-ai-onebox.tsx", "/api/construction-calc"],
] as const;

const NON_GENERATIVE_CLIENTS = [
  "components/accidents/accident-ai-analyzer.tsx",
  "components/goods-chatbot.tsx",
  "components/home-safety-alert-generator.tsx",
  "components/language-button.tsx",
] as const;

describe("client generative-AI safety boundary", () => {
  it.each(USER_TEXT_AI_CLIENTS)(
    "%s blocks emergency/PII/confidential text before the AI request",
    (relativeFile, endpoint) => {
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src", relativeFile),
        "utf8",
      );
      const endpointIndex = source.lastIndexOf(endpoint);
      const gateIndex = Math.max(
        source.lastIndexOf("inspectAiOutbound({", endpointIndex),
        source.lastIndexOf("runClientAiAction(", endpointIndex),
      );
      expect(endpointIndex).toBeGreaterThan(0);
      expect(gateIndex, relativeFile).toBeGreaterThan(0);
      const preflight = source.slice(gateIndex, endpointIndex);
      expect(preflight).toMatch(
        /if \(!outboundSafety\.allowed\)|runClientAiAction\(/,
      );
    },
  );

  it.each(NON_GENERATIVE_CLIENTS)(
    "%s does not contain a model-provider call or render generated recommendations",
    (relativeFile) => {
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src", relativeFile),
        "utf8",
      );
      expect(source).not.toMatch(
        /GoogleGenAI|generativelanguage\.googleapis\.com|generateContent(?:Stream)?\(/,
      );
      expect(source).not.toContain("source === \"gemini\"");
      if (relativeFile.includes("goods-chatbot")) {
        expect(source).not.toContain("generateAmazonAffiliateUrl");
        expect(source).not.toContain("generateRakutenSearchUrl");
      }
    },
  );

  it("legacy law-chat blocks input before the service/network boundary", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/home-screen.tsx"),
      "utf8",
    );
    const gateIndex = source.indexOf("runClientAiAction(");
    const sendIndex = source.indexOf("services.chat.sendMessage");
    expect(gateIndex).toBeGreaterThan(0);
    expect(sendIndex).toBeGreaterThan(gateIndex);
    expect(source.slice(gateIndex, sendIndex)).toContain("purpose: \"legacy-law-chat-client\"");
  });

  it("shared preflight rejects emergency, PII and confidential labels without returning raw text", async () => {
    const { inspectAiOutbound } = await import("@/lib/ai-outbound-safety");
    for (const text of [
      "作業員が倒れて意識がありません",
      "担当者は山田太郎です",
      "現場名: 青葉ビル新築工事",
    ]) {
      const result = inspectAiOutbound({
        purpose: "client-regression-test",
        texts: [text],
        consent: true,
        contextPolicy: "no-context",
      });
      expect(result.allowed).toBe(false);
      expect(JSON.stringify(result)).not.toContain(text);
    }
  });
});
