import { describe, expect, it } from "vitest";

import article from "./heat-stroke-2025-mandatory.json";
import articleBody from "./bodies/heat-stroke-2025-mandatory.json";

describe("heat illness article current-source boundary", () => {
  it("取得確認を記録し、公開用の概要に確認待ちの注記を含めない", () => {
    expect(article.sourceRetrievedAt).toBe("2026-07-24");
    expect(article.description).not.toContain("人手内容確認待ち");
    expect(article.author.name).not.toMatch(
      /労働安全衛生コンサルタント監修|専門家監修/,
    );
  });

  it("検索用データから本文・出典・関連リンクを分離する", () => {
    expect(article).not.toHaveProperty("sections");
    expect(article).not.toHaveProperty("sources");
    expect(article).not.toHaveProperty("ctaSlot");
  });

  it("法定2項目と施行通達の対象作業を区別し、両方の公式資料を示す", () => {
    const sectionsText = JSON.stringify(articleBody.sections);
    expect(article.title).toContain("第612条の2の法定2項目");
    expect(article.title).toContain("対象作業");
    expect(article.title).not.toContain("WBGT基準");
    expect(articleBody.sections.map((section) => section.heading)).toContain(
      "自主点検で確認する事項",
    );
    expect(sectionsText).not.toContain("監督指導で頻発する指摘事項");
    expect(sectionsText).toContain(
      "WBGTが28度以上または気温が31度以上の場所で、連続1時間以上または1日4時間を超えて",
    );
    expect(articleBody.sources.map((source) => source.url)).toEqual(expect.arrayContaining([
      "https://www.mhlw.go.jp/content/11303000/001476789.pdf",
      "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    ]));
  });

  it("現行ガイドラインを正本へ案内し、旧要綱を廃止済みと表示する", () => {
    const sources = articleBody.sources.map((source) => ({
      label: source.label,
      url: source.url,
    }));
    const current = sources.find((source) =>
      source.label.includes("基発0318第1号"),
    );
    const superseded = sources.find((source) =>
      source.label.includes("基発0420第3号"),
    );

    expect(article.lastReviewedAt).toBe("2026-11-18");
    expect(current?.url).toBe(
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1",
    );
    expect(superseded?.label).toContain("廃止");
    expect(JSON.stringify(articleBody.sections)).toContain("現行ガイドライン");
    expect(JSON.stringify(articleBody.sections)).not.toContain(
      "厚生労働省の要綱と",
    );
  });
});
