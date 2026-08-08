import { describe, expect, it } from "vitest";
import { officialNotices } from "./notices-and-precedents";
import { realLawRevisionsExtra } from "./real-law-revisions-extra";

describe("customer harassment legal accuracy", () => {
  it("指針の告示番号・公布日・施行日を公式公表と一致させる", () => {
    const guideline = officialNotices.find(
      (record) => record.id === "nt-2025-customer-harassment",
    );

    expect(guideline).toMatchObject({
      category: "告示",
      revisionNumber: "令和8年厚生労働省告示第51号",
      publication_date: "2026-02-26",
      enforcement_date: "2026-10-01",
    });
    expect(guideline?.notice_link).toBe(
      "https://www.mhlw.go.jp/web/t_doc?dataId=75ac0814&dataType=0&pageNo=1",
    );
  });

  it("改正法の法律番号・公布日・施行日を公式公表と一致させる", () => {
    const amendment = realLawRevisionsExtra.find(
      (record) => record.id === "lr-extra-2025-005",
    );

    expect(amendment).toMatchObject({
      revisionNumber: "令和7年法律第63号",
      publication_date: "2025-06-11",
      enforcement_date: "2026-10-01",
      category: "労働施策総合推進法",
    });
  });
});
