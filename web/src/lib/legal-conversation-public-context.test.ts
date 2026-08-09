import { describe, expect, it } from "vitest";
import {
  PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS,
  rehydratePublicLegalConversationContext,
  sanitizePublicLegalConversationContext,
} from "@/lib/legal-conversation-public-context";

const FORBIDDEN_CONTEXT_KEYS = [
  "workType",
  "height",
  "load",
  "qualification",
  "role",
  "targetDate",
  "targetDateEnd",
  "targetDatePrecision",
] as const;

describe("public legal conversation context", () => {
  it("projects legacy electrical context to exactly the nine-key public contract", () => {
    const context = sanitizePublicLegalConversationContext({
      workType: "電気作業",
      equipment: "電気設備",
      height: "2m以上",
      load: "最大荷重1.5t",
      voltageClass: "低圧",
      qualification: "特別教育",
      role: "作業指揮者",
      targetDate: "2026-08-09",
      targetDateEnd: "2026-08-31",
      targetDatePrecision: "month",
      confirmedChoices: ["見るだけ", "山田太郎"],
    });

    expect(context).toMatchObject({
      topicDomain: "electrical",
      equipment: "電気設備",
      voltageClass: "低圧",
      qualificationType: "special-education",
      roleType: "work-leader",
      workDate: "2026-08-09",
      confirmedChoices: ["見るだけ", "高さ2m以上", "最大荷重1.5t"],
    });
    expect(Object.keys(context).every((key) =>
      PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS.includes(
        key as (typeof PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS)[number],
      ),
    )).toBe(true);
    for (const key of FORBIDDEN_CONTEXT_KEYS) {
      expect(context).not.toHaveProperty(key);
    }
    expect(JSON.stringify(context)).not.toContain("山田太郎");
  });

  it("keeps forklift, sling, high-place, and crane conditions without free text", () => {
    const cases = [
      ["フォークリフト運転", "最大荷重1.5t", "forklift"],
      ["玉掛け", "つり上げ荷重0.8t", "lifting"],
      ["足場作業", "高さ2m以上", "fall"],
      ["移動式クレーン運転", "つり上げ荷重5t", "lifting"],
    ] as const;

    for (const [workType, condition, topicDomain] of cases) {
      const legacyField = condition.startsWith("高さ") ? "height" : "load";
      const legacyValue = condition.replace(/^高さ/, "");
      const projected = sanitizePublicLegalConversationContext({
        workType,
        [legacyField]: legacyValue,
      });
      expect(projected.topicDomain).toBe(topicDomain);
      expect(projected.confirmedChoices).toContain(condition);

      const hydrated = rehydratePublicLegalConversationContext(projected);
      expect(hydrated.workType).toBe(workType);
      expect(
        legacyField === "height" ? hydrated.height : hydrated.load,
      ).toBe(legacyValue);
    }
  });

  it("rejects arbitrary equipment, choices, invalid dates, and forbidden fields", () => {
    const context = sanitizePublicLegalConversationContext({
      topicDomain: "general",
      equipment: "山田太郎の新宿現場",
      confirmedChoices: ["株式会社安全", "090-1234-5678"],
      workDate: "2026-02-30",
      workType: "山田太郎が作業する設備",
      role: "山田太郎",
    });

    expect(context).toEqual({ topicDomain: "general" });
  });

  it("accepts only canonical measured choices when rehydrating a public request", () => {
    const hydrated = rehydratePublicLegalConversationContext({
      topicDomain: "forklift",
      equipment: "フォークリフト運転",
      confirmedChoices: ["最大荷重1.5t", "荷重は山田さん確認"],
    });

    expect(hydrated.workType).toBe("フォークリフト運転");
    expect(hydrated.load).toBe("最大荷重1.5t");
    expect(JSON.stringify(hydrated)).not.toContain("山田");
  });
});
