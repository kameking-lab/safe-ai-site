import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  extractLegalItems,
  extractLegalParagraph,
  extractRequestedLegalItem,
} from "@/lib/legal-unit-extract";

function article(text: string): LawArticle {
  return {
    law: "労働安全衛生法施行令",
    lawShort: "安衛令",
    articleNum: "第20条",
    articleTitle: "就業制限に係る業務",
    text,
    keywords: ["就業制限"],
  };
}

describe("明示された号の本文抽出", () => {
  it("e-Govフラット本文の漢数字見出しを次号の直前まで抽出する", () => {
    const result = extractRequestedLegalItem(
      article(
        "十　可燃性ガスを用いる業務十一　最大荷重一トン以上のフオークリフト運転の業務十二　高所作業車運転の業務",
      ),
      "安衛令第20条第11号は？",
    );
    expect(result).toMatchObject({
      item: "第11号",
      text: "最大荷重一トン以上のフオークリフト運転の業務",
    });
  });

  it("curated本文の第N号見出しも抽出する", () => {
    const result = extractRequestedLegalItem(
      article(
        "第10号　可燃性ガスを用いる業務。第11号　最大荷重一トン以上のフォークリフト運転の業務。第12号　高所作業車運転の業務。",
      ),
      "安衛令第20条の第11号を教えて",
    );
    expect(result?.item).toBe("第11号");
    expect(result?.text).toContain("最大荷重一トン以上");
    expect(result?.text).not.toContain("第12号");
  });

  it("号の枝番を親号へ潰さず第10号の5として分割する", () => {
    const items = extractLegalItems(
      article(
        "十　可燃性ガスの業務十の五　作業床の高さが十メートル未満の高所作業車の運転十一　巻上げ機の運転",
      ),
    );
    expect(items.map((item) => item.item)).toEqual([
      "第10号",
      "第10号の5",
      "第11号",
    ]);
    expect(items[1]?.text).toContain("高所作業車");
  });
});

describe("明示・推定された項の本文抽出", () => {
  const paragraphArticle = article(
    "事業者は事前調査を行わなければならない。２　前項の調査は文書と目視により行う。３　既存調査の記録を確認できる。４　事業者は、必要な知識を有する者として厚生労働大臣が定めるものに事前調査を行わせなければならない。５　分析調査を行わなければならない。",
  );

  it.each(["第4項", "第四項", "第４項", 4])(
    "第4項だけを次項の直前まで抽出する: %s",
    (paragraph) => {
      const result = extractLegalParagraph(paragraphArticle, paragraph);
      expect(result).toMatchObject({ paragraph: "第4項" });
      expect(result?.text).toContain("必要な知識を有する者");
      expect(result?.text).not.toContain("文書と目視");
      expect(result?.text).not.toContain("分析調査を行わなければ");
    },
  );

  it("第1項は無見出しの先頭から第2項直前まで抽出する", () => {
    const result = extractLegalParagraph(paragraphArticle, "第1項");
    expect(result?.text).toContain("事前調査を行わなければ");
    expect(result?.text).not.toContain("文書と目視");
  });
});
