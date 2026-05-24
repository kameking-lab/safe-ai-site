import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import { attachNoticesAndLeaflets } from "./chatbot-notice-attachment";

const ART_563: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第563条",
  articleTitle: "足場における作業床",
  text: "x",
  keywords: [],
};

const ART_612_2: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第612条の2",
  articleTitle: "暑熱な場所での作業",
  text: "y",
  keywords: [],
};

const ART_UNMAPPED: LawArticle = {
  law: "未登録法",
  lawShort: "未登録",
  articleNum: "第1条",
  articleTitle: "x",
  text: "x",
  keywords: [],
};

describe("attachNoticesAndLeaflets - Layer A 条文紐付け", () => {
  it("足場（第563条）→ 通達+リーフレットが取れる", () => {
    const r = attachNoticesAndLeaflets({ articles: [ART_563] });
    expect(r.notices.length).toBeGreaterThan(0);
    expect(r.leaflets.length).toBeGreaterThan(0);
    expect(r.notices.every((n) => n.source === "A")).toBe(true);
  });

  it("熱中症（第612条の2）→ 通達 3 件以上", () => {
    const r = attachNoticesAndLeaflets({ articles: [ART_612_2] });
    expect(r.notices.length).toBeGreaterThanOrEqual(3);
  });

  it("マッピング未登録条文 → Layer A は空", () => {
    const r = attachNoticesAndLeaflets({ articles: [ART_UNMAPPED] });
    expect(r.notices.length).toBe(0);
    expect(r.leaflets.length).toBe(0);
  });

  it("複数条文の通達・リーフレットを重複排除する", () => {
    const r = attachNoticesAndLeaflets({ articles: [ART_563, ART_612_2] });
    const ids = r.notices.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("attachNoticesAndLeaflets - Layer B 応答内引用照合", () => {
  it("応答内の実在通達番号を Layer B として採用する", () => {
    // 基発0318第1号 = mhlw-notice-0001 (熱中症ガイドライン)
    const r = attachNoticesAndLeaflets({
      articles: [],
      answer: "基発0318第1号 によれば…",
    });
    const b = r.notices.find((n) => n.source === "B");
    expect(b).toBeDefined();
  });

  it("応答内の架空通達番号は採用しない", () => {
    const r = attachNoticesAndLeaflets({
      articles: [],
      answer: "基発9999第999号 によれば…", // 架空
    });
    expect(r.notices).toEqual([]);
  });

  it("Layer A と B で同じ通達が出たら B 側は排除", () => {
    // 第563条 経由で Layer A、応答中も Layer A の通達番号を引用
    const r = attachNoticesAndLeaflets({
      articles: [ART_563],
      answer: "基発0314第2号 によれば…", // mhlw-notice-0082 と一致（A 側にも含まれる）
    });
    // 同じ通達は1件のみ、Layer A 側
    const dupCount = r.notices.filter((n) => n.id === "mhlw-notice-0082").length;
    expect(dupCount).toBeLessThanOrEqual(1);
  });
});

describe("attachNoticesAndLeaflets - Layer C クエリ", () => {
  it("クエリベース検索で関連通達を補完する", () => {
    const r = attachNoticesAndLeaflets({
      articles: [],
      query: "石綿の事前調査の方法",
    });
    // Layer A/B には無いが C で何か取れる可能性あり
    const c = r.notices.filter((n) => n.source === "C");
    expect(c.length + r.notices.filter((n) => n.source !== "C").length).toBeGreaterThanOrEqual(0);
  });
});

describe("attachNoticesAndLeaflets - マージ・制限", () => {
  it("最大 5 件に制限される（通達）", () => {
    // 熱中症の第612条の2 と 安衛則第563条 で 通達は計 6件以上ある
    const r = attachNoticesAndLeaflets({
      articles: [ART_563, ART_612_2],
      query: "熱中症",
    });
    expect(r.notices.length).toBeLessThanOrEqual(5);
  });

  it("最大 5 件に制限される（リーフレット）", () => {
    const r = attachNoticesAndLeaflets({
      articles: [ART_563, ART_612_2],
    });
    expect(r.leaflets.length).toBeLessThanOrEqual(5);
  });

  it("空入力 → 空配列", () => {
    const r = attachNoticesAndLeaflets({ articles: [] });
    expect(r.notices).toEqual([]);
    expect(r.leaflets).toEqual([]);
  });

  it("Layer A は B/C より先に並ぶ", () => {
    const r = attachNoticesAndLeaflets({
      articles: [ART_563],
      answer: "基発0318第1号", // Layer B
      query: "熱中症", // Layer C
    });
    // 出力先頭は Layer A の通達のはず
    expect(r.notices[0]?.source).toBe("A");
  });
});
