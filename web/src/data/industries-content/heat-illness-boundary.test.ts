import { describe, expect, it } from "vitest";

import { foodContent } from "./food";
import { listIndustryContents } from "./index";
import { retailContent } from "./retail";
import { serviceContent } from "./service";

describe("industry content heat-illness legal boundary", () => {
  it("does not present WBGT measurement, prevention education, or all controls as newly statutory", () => {
    const text = JSON.stringify(listIndustryContents());
    expect(text).not.toMatch(
      /R7(?:\.6\.1)?義務化対応|2025年6月義務化|R7\.6\.1義務化|WBGT測定義務化|作業計画とWBGT測定が義務化|熱中症予防義務を強化|WBGT基準値超過が常態/,
    );
    expect(text).not.toContain("mhlw-notice-0920");
    expect(text).not.toContain("mhlw-notice-0921");
  });

  it("separates Article 612-2 duties from notice criteria and guideline controls", () => {
    const foodLaw = foodContent.lawHighlights.find((entry) =>
      entry.name.includes("第612条の2"),
    );
    expect(foodLaw?.note).toContain("報告体制");
    expect(foodLaw?.note).toContain("悪化防止手順");
    expect(foodLaw?.note).toContain("法定2項目");
    expect(foodLaw?.note).toContain("ガイドライン");

    const faq = foodContent.faq.find((entry) =>
      entry.question.includes("WBGT測定"),
    );
    expect(faq?.answer).toContain(
      "WBGT測定そのものが第612条の2で義務化された」とは扱いません",
    );
    expect(faq?.answer).toContain("基発0520第6号");
    expect(faq?.answer).toContain("対象の目安");
    expect(faq?.answer).toContain("法定2項目");
    expect(faq?.answer).toContain("ガイドライン上の予防策");
  });

  it("uses the locally identified implementation notice and labels prevention education as non-special education", () => {
    for (const content of [foodContent, serviceContent, retailContent]) {
      const heatCircular = content.circulars.find((entry) =>
        entry.title.includes("基発0520第6号"),
      );
      expect(heatCircular?.id).toBe("mhlw-notice-0014");
      expect(heatCircular?.relevance).toContain("報告体制");
      expect(heatCircular?.relevance).toContain("悪化防止手順");
    }

    for (const content of [foodContent, serviceContent]) {
      const education = content.educationCerts.find((entry) =>
        entry.name.includes("熱中症予防"),
      );
      expect(education?.target).toContain("ガイドライン");
      expect(education?.target).toContain("特別教育ではない");
    }
  });
});
