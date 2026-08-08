import { describe, expect, it } from "vitest";

import article from "./heat-stroke-2025-mandatory.json";

describe("heat illness article current-source boundary", () => {
  it("取得確認と人手内容確認を分離し、未確認の監修を表示しない", () => {
    expect(article).toMatchObject({
      sourceRetrievedAt: "2026-07-24",
      humanReviewedAt: null,
      reviewStatus: "source-url-located-human-content-review-pending",
    });
    expect(article.description).toContain("人手内容確認待ち");
    expect(article.author.name).toContain("人手監修未完了");
    expect(article.author.name).not.toMatch(
      /労働安全衛生コンサルタント監修|専門家監修/,
    );
  });

  it("法定2項目と施行通達の対象作業目安を見出し・本文で分離する", () => {
    const sectionsText = JSON.stringify(article.sections);
    expect(article.title).toContain("第612条の2の法定2項目");
    expect(article.title).toContain("施行通達の対象作業目安");
    expect(article.title).not.toContain("WBGT基準");
    expect(article.sections.map((section) => section.heading)).toContain(
      "自主点検で確認する事項",
    );
    expect(sectionsText).not.toContain("監督指導で頻発する指摘事項");
    expect(sectionsText).toContain(
      "第612条の2の条文本文に置かれた一律の法定閾値ではない",
    );
  });

  it("現行ガイドラインを正本へ案内し、旧要綱を廃止済みと表示する", () => {
    const sources = article.sources.map((source) => ({
      label: source.label,
      url: source.url,
    }));
    const current = sources.find((source) =>
      source.label.includes("基発0318第1号"),
    );
    const superseded = sources.find((source) =>
      source.label.includes("基発0420第3号"),
    );

    expect(article.lastReviewedAt).toBe("2026-07-24");
    expect(current?.url).toBe(
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1",
    );
    expect(superseded?.label).toContain("廃止");
    expect(JSON.stringify(article.sections)).toContain("現行ガイドライン");
    expect(JSON.stringify(article.sections)).not.toContain(
      "厚生労働省の要綱と",
    );
  });
});
