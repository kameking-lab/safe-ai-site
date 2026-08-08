import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function expectBefore(text: string, first: string, second: string): void {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  expect(firstIndex, `missing first marker: ${first}`).toBeGreaterThanOrEqual(0);
  expect(secondIndex, `missing second marker: ${second}`).toBeGreaterThanOrEqual(0);
  expect(firstIndex, `${first} must precede ${second}`).toBeLessThan(secondIndex);
}

describe("PF-001 emergency interception order across AI and record paths", () => {
  it("PF-001-OUTBOUND-PRECEDENCE checks emergency before length, privacy, and consent", () => {
    const text = source("src/lib/ai-outbound-safety.ts");
    expectBefore(text, "const emergency =", "joined.length >");
    expectBefore(
      text,
      "const emergency =",
      "normalized.some((text) => detectChatbotSensitiveData",
    );
    expectBefore(text, "const emergency =", "input.consent !== true");
  });

  it("PF-001-KY-CLIENT-PRECEDENCE blocks emergency before missing fields, consent, autosave, and network", () => {
    const text = source("src/components/ky-paper/ky-paper-view.tsx");
    expectBefore(
      text,
      "const emergency = [",
      "const parsedContext = parseKySuggestionContext",
    );
    expectBefore(
      text,
      "const parsedContext = parseKySuggestionContext",
      "if (!aiProviderConsent)",
    );
    expectBefore(text, "if (activeEmergency)", "localStorage.setItem");
    expectBefore(text, "const emergency = [", 'fetch("/api/ky/suggest"');
  });

  it("PF-001-KY-API-PRECEDENCE blocks before rate limiting and RAG", () => {
    const text = source("src/app/api/ky/suggest/route.ts");
    expectBefore(
      text,
      "const outboundSafety = inspectAiOutbound",
      "await consumeRequestRateLimit",
    );
    expectBefore(
      text,
      "const outboundSafety = inspectAiOutbound",
      "const examples = suggestVerifiedKyEvidence",
    );
  });

  it("PF-001-MEETING-PRECEDENCE blocks before missing fields, autosave, and degraded response", () => {
    const client = source("src/components/meeting/meeting-paper-view.tsx");
    const route = source("src/app/api/meeting/suggest/route.ts");
    expectBefore(client, "const emergency = [", "const missing = [");
    expectBefore(client, "if (activeEmergency)", "saveCurrentMeeting(record)");
    expectBefore(route, "const outboundSafety = inspectAiOutbound", "suggestion_provenance_unavailable");
  });

  it("PF-001-LEGACY-CHAT-CONSENT uses the shared preflight before the service action", () => {
    const text = source("src/components/home-screen.tsx");
    expect(text).not.toContain("if (!lawChatPrivacyConfirmed)");
    expectBefore(text, "runClientAiAction(", "services.chat.sendMessage");
  });

  it("PF-001-CALC-CONSENT lets emergency preflight run without consent and before fetch", () => {
    const text = source("src/components/construction-calc/calc-ai-onebox.tsx");
    expect(text).toContain("if (!trimmed || loading) return");
    expect(text).not.toContain("loading || !text.trim() || !aiProviderConsent");
    expectBefore(text, "const outboundSafety = inspectAiOutbound", 'fetch("/api/construction-calc"');
  });

  it("PF-001-GOODS-AND-ACCIDENT-CLIENTS suppress ordinary CTAs before network", () => {
    const goods = source("src/components/goods-chatbot.tsx");
    const accidents = source("src/components/accidents/accident-ai-analyzer.tsx");
    expectBefore(goods, "evaluateChatbotSafety(", "fetch(");
    expectBefore(goods, "setResult(null)", "fetch(");
    expectBefore(accidents, "evaluateChatbotSafety(", "fetch(");
    expectBefore(accidents, "setCases(null)", "fetch(");
  });

  it("PF-001-DIRECT-APIS intercept before ordinary search or degraded output", () => {
    const goods = source("src/app/api/goods-chat/route.ts");
    const accidents = source("src/app/api/accidents/analyze/route.ts");
    const legacyKy = source("src/app/api/ky-suggestion/route.ts");
    expectBefore(goods, "const safety = evaluateChatbotSafety", "const response: GoodsChatResponse");
    expectBefore(accidents, "const safety = evaluateChatbotSafety", "accident_corpus_quarantined");
    expectBefore(legacyKy, "const safety =", "const results = suggestKyByIndustryAndWork");
  });

  it("PF-001-SHARE-REINSPECTION never reads or renders conversation fragments", () => {
    const text = source("src/components/chatbot/share-fragment-view.tsx");
    expect(text).toContain("window.history.replaceState(");
    expect(text).not.toContain("decodeChatbotShareFragment");
    expect(text).not.toContain("message.c");
  });
});
