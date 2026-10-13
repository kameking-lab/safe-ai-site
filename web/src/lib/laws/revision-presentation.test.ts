import { describe, expect, it } from "vitest";
import type { LawRevision } from "@/lib/types/domain";
import { CABINET_ORDER_196_SOURCE, lawRevisionFacts, lawRevisionHeadline, lawRevisionKindLabel } from "./revision-presentation";
import { lawRevisionCores } from "@/data/mock/law-revisions";

const revision: LawRevision = {
  id: "lr-egov-test",
  title: "作業環境測定法施行令（関係政令の整備に関する政令）",
  publishedAt: "2026-05-26",
  revisionNumber: "令和八年政令第百九十六号",
  category: "省令",
  kind: "ordinance",
  issuer: "内閣",
  summary: "改正法令「関係政令の整備に関する政令」。改正内容の詳細はe-Govの原文で必ずご確認ください。",
  enforcement_date: "2026-10-01",
};

describe("law revision presentation", () => {
  it("法令番号が政令のとき、誤った入力種別をそのまま省令と表示しない", () => {
    expect(lawRevisionKindLabel(revision)).toBe("政令");
    expect(lawRevisionKindLabel({ ...revision, revisionNumber: "令和八年厚生労働省令第百十六号" })).toBe("省令");
    const decree196 = lawRevisionCores.find((item) => item.revisionNumber === "令和八年政令第百九十六号");
    expect(decree196?.kind).toBe("cabinet_order");
    expect(decree196?.category).toBe("政令");
    expect(decree196?.issuer).toBe("内閣");
    expect(decree196 && lawRevisionHeadline(decree196)).toBe("関係政令の整備に関する政令（令和8年政令第196号）");
    expect(decree196 && lawRevisionFacts(decree196)).toEqual({
      target: "作業環境測定法施行令の附則（安衛令に収録された抜粋）",
      change: "労働安全衛生法の制定年・法律番号の引用を削除。安衛令の本則変更ではありません。",
      effectiveDate: "2026-10-01",
    });
    expect(CABINET_ORDER_196_SOURCE.url).toBe("https://www.mhlw.go.jp/content/11300000/001736042.pdf");
  });

  it("対象と施行日を示し、構造データにない変更内容は作らない", () => {
    expect(lawRevisionFacts(revision)).toEqual({
      target: "作業環境測定法施行令",
      change: "内容未確認（原文で確認）",
      effectiveDate: "2026-10-01",
    });
    expect(lawRevisionFacts({ ...revision, enforcement_date: "" }).effectiveDate).toBeNull();
  });
});
