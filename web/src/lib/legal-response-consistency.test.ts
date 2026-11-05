import { describe, expect, it } from "vitest";
import { finalizeChatbotResponse, type ChatbotSource } from "./chatbot-contract";
import { lawArticleToSource } from "./chatbot-route-shared";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";

const source = (overrides: Partial<ChatbotSource> = {}): ChatbotSource => ({
  law: "クレーン等安全規則", article: "第221条", text: "テスト用本文",
  asOf: "2026-04-01", effectiveOn: "2026-04-01", applicationStatus: "current", ...overrides,
});
const finalize = (sources: ChatbotSource[], extra = {}) => finalizeChatbotResponse({
  answer: "要件を確認しました。\n\n回答基準日: 2026-10-12 JST",
  sources, source_type: "rag", confidence: "high", requiresHumanReview: true, ...extra,
});

describe("cross-law answer application dates", () => {
  it("keeps a consistent historical target separate from the audit date", () => {
    const out = finalize([source(), source({ law: "労働安全衛生法", effectiveOn: "2025-04-01" })]);
    expect(out.effectiveDateStatus.asOf).toBe("2026-04-01");
    expect(out.effectiveDateStatus.status).toBe("current");
    expect(out.directAnswer).toContain("要件を確認しました。");
  });
  it.each([
    [source(), source({ asOf: "2026-03-31", effectiveOn: "2025-04-01" })],
    [source({ asOf: "2026-03-31" })],
    [source({ asOf: "2026-02-30" })],
    [source({ asOf: undefined })],
    [source({ effectiveOn: "2026-02-30" })],
  ])("withholds conclusions for inconsistent dates: %j", (...sources) => {
    const out = finalize(sources);
    expect(out.effectiveDateStatus.status).toBe("unknown");
    expect(out.confidence).toBe("low");
    expect(out.answer).not.toContain("要件を確認しました");
    expect(out.directAnswer).toContain("確認");
    expect(out.scopeWarnings?.length).toBe(1);
    expect(out.sources).toEqual(sources);
  });
  it("does not claim current when one source has unknown status", () => {
    const out = finalize([source(), source({ applicationStatus: undefined })]);
    expect(out.effectiveDateStatus.status).toBe("unknown");
  });
  it("does not allow a stale caller to override conflicting sources", () => {
    const out = finalize([source()], { effectiveDateStatus: {
      asOf: "2026-03-31", status: "current", label: "施行中",
    }});
    expect(out.effectiveDateStatus.status).toBe("unknown");
    expect(out.answer).not.toContain("要件を確認しました");
  });
  it("allows correctly labeled future sources without treating them as current", () => {
    expect(finalize([source({ asOf: "2026-03-31", applicationStatus: "future" })])
      .effectiveDateStatus.status).toBe("future");
  });
  it("accepts actual source-adapter Japanese effective-date metadata", () => {
    const article = verifiedLawArticles.find(a => a.lawShort === "安衛則" && a.articleNum === "第612条の2")!;
    const actual = lawArticleToSource(article, "熱中症対策の義務は", new Date("2026-10-12T00:00:00+09:00"));
    expect(actual.effectiveOn).toContain("令和7年6月1日");
    expect(finalize([actual]).effectiveDateStatus.status).toBe("current");
    expect(finalize([actual]).scopeWarnings).toBeUndefined();
  });
  it("checks every date in a multiple-effective-date label", () => {
    const actual = source({ effectiveOn: "令和5年10月1日施行（建築物・船舶）／令和8年1月1日施行（工作物）" });
    expect(finalize([actual]).effectiveDateStatus.status).toBe("current");
    expect(finalize([{ ...actual, asOf: "2025-12-31" }]).effectiveDateStatus.status).toBe("unknown");
  });
});
