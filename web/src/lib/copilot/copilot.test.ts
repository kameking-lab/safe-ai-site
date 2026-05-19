import { describe, expect, it } from "vitest";
import {
  createEmptySafetyContext,
  normalizeSafetyContext,
  SAFETY_CONTEXT_MAX_CONCERNS,
  SAFETY_CONTEXT_MAX_QUERIES,
} from "@/lib/copilot/types";
import {
  detectConcerns,
  detectFocusAreas,
  detectIndustry,
} from "@/lib/copilot/keyword-routing";

describe("copilot/types", () => {
  it("returns an empty default context", () => {
    const c = createEmptySafetyContext();
    expect(c.industry).toBeUndefined();
    expect(c.keyConcerns).toEqual([]);
    expect(c.recentQueries).toEqual([]);
    expect(c.progress.visitedChatbot).toBe(false);
    expect(c.progress.generatedPlan).toBe(false);
  });

  it("normalizes a partial payload safely", () => {
    const out = normalizeSafetyContext({
      industry: "construction",
      keyConcerns: ["墜落", "", 42, "  "],
      recentQueries: [
        { query: "足場の組み立て", source: "chatbot", at: 1 },
        { query: "bad", source: "unknown" },
        "garbage",
      ],
      progress: { visitedChatbot: true },
      activePlan: { industry: "construction", templateId: "construction-medium", href: "/strategy/plan-generator/preview/construction-medium" },
    });
    expect(out.industry).toBe("construction");
    expect(out.keyConcerns).toEqual(["墜落"]);
    expect(out.recentQueries).toHaveLength(1);
    expect(out.recentQueries[0]?.query).toBe("足場の組み立て");
    expect(out.progress.visitedChatbot).toBe(true);
    expect(out.activePlan?.templateId).toBe("construction-medium");
  });

  it("drops invalid industry slugs", () => {
    const out = normalizeSafetyContext({ industry: "agriculture" });
    expect(out.industry).toBeUndefined();
  });

  it("caps keyConcerns and recentQueries at the documented maxima", () => {
    const longConcerns = Array.from({ length: 30 }, (_, i) => `concern-${i}`);
    const longQueries = Array.from({ length: 30 }, (_, i) => ({
      query: `q-${i}`,
      source: "chatbot",
      at: i,
    }));
    const out = normalizeSafetyContext({
      keyConcerns: longConcerns,
      recentQueries: longQueries,
    });
    expect(out.keyConcerns).toHaveLength(SAFETY_CONTEXT_MAX_CONCERNS);
    expect(out.recentQueries).toHaveLength(SAFETY_CONTEXT_MAX_QUERIES);
  });
});

describe("copilot/keyword-routing", () => {
  it("detects construction from a free-form question", () => {
    const m = detectIndustry("建設業の墜落事故を防ぐにはどうすればいい?");
    expect(m?.slug).toBe("construction");
  });

  it("detects healthcare from 介護 mention", () => {
    expect(detectIndustry("介護施設の腰痛対策")?.slug).toBe("healthcare");
  });

  it("returns null when no industry is mentioned", () => {
    expect(detectIndustry("こんにちは")).toBeNull();
  });

  it("detects multiple focus areas at once", () => {
    const focus = detectFocusAreas("特別教育と健康診断とリスクアセスメントについて");
    expect(focus).toContain("education");
    expect(focus).toContain("health-check");
    expect(focus).toContain("ra");
  });

  it("maps 熱中症 to industry-specific focus", () => {
    expect(detectFocusAreas("熱中症")).toContain("industry-specific");
  });

  it("detects concerns from text", () => {
    const cs = detectConcerns("夏場の熱中症と墜落事故");
    expect(cs).toContain("熱中症");
    expect(cs).toContain("墜落");
  });
});
