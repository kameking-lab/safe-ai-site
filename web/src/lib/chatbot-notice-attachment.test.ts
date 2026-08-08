import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  isNoticeIndividuallyVerified,
  verifiedMhlwNotices,
} from "@/data/public-mhlw-notices";
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
  it("足場（第563条）→ 未確認通達を除外し、リーフレットは維持する", () => {
    const r = attachNoticesAndLeaflets({ articles: [ART_563] });
    expect(r.notices).toEqual([]);
    expect(r.leaflets.length).toBeGreaterThan(0);
  });

  it("熱中症（第612条の2）→ 個別照合済みの基発0520第6号だけを関連資料にする", () => {
    const r = attachNoticesAndLeaflets({ articles: [ART_612_2] });
    expect(verifiedMhlwNotices).toHaveLength(1);
    expect(r.notices).toHaveLength(1);
    expect(r.notices[0]).toMatchObject({
      id: "mhlw-notice-0014",
      noticeNumber: "基発0520第6号",
      issuedDateRaw: "令和7年5月20日",
      source: "A",
      evidenceRole: "related-material",
      detailUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
      locator: "PDF 2ページ 第3 1(1)イ",
      independentlyCheckedAt: "2026-08-02",
    });
    expect(r.notices[0]?.excerpt).toContain("WBGT");
    expect(r.notices[0]?.excerpt).toContain("１日当たり４時間を超えて");
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
  it("番号が公開索引に存在しても、個別未確認なら Layer B に採用しない", () => {
    expect(isNoticeIndividuallyVerified("mhlw-notice-0001")).toBe(false);
    const r = attachNoticesAndLeaflets({
      articles: [],
      answer: "基発0318第1号 によれば…",
    });
    expect(r.notices).toEqual([]);
  });

  it("基発0520第6号の明示引用は公式PDF付きの関連資料として採用する", () => {
    const r = attachNoticesAndLeaflets({
      articles: [],
      answer: "基発0520第6号の対象作業の目安です。",
    });
    expect(r.notices).toHaveLength(1);
    expect(r.notices[0]).toMatchObject({
      id: "mhlw-notice-0014",
      source: "B",
      evidenceRole: "related-material",
      pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    });
  });

  it("応答内の架空通達番号は採用しない", () => {
    const r = attachNoticesAndLeaflets({
      articles: [],
      answer: "基発9999第999号 によれば…", // 架空
    });
    expect(r.notices).toEqual([]);
  });

  it("Layer A と B の双方に現れる未確認通達も採用しない", () => {
    const r = attachNoticesAndLeaflets({
      articles: [ART_563],
      answer: "基発0314第2号 によれば…",
    });
    expect(r.notices).toEqual([]);
  });
});

describe("attachNoticesAndLeaflets - Layer C クエリ", () => {
  it("クエリ検索も個別確認済み通達だけを返す", () => {
    const r = attachNoticesAndLeaflets({
      articles: [],
      query: "石綿の事前調査の方法",
    });
    expect(
      r.notices.every((notice) => isNoticeIndividuallyVerified(notice.id)),
    ).toBe(true);
  });

  it("熱中症の現場語検索から基発0520第6号へ到達する", () => {
    const r = attachNoticesAndLeaflets({
      articles: [],
      query: "熱中症の報告体制は義務？",
    });
    expect(r.notices.map((notice) => [notice.id, notice.source])).toEqual([
      ["mhlw-notice-0014", "C"],
    ]);
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

  it("未確認の Layer A/B を混ぜず、個別確認済みLayer Cだけを返す", () => {
    const r = attachNoticesAndLeaflets({
      articles: [ART_563],
      answer: "基発0318第1号", // Layer B
      query: "熱中症", // Layer C
    });
    expect(r.notices.map((notice) => [notice.id, notice.source])).toEqual([
      ["mhlw-notice-0014", "C"],
    ]);
    expect(r.leaflets.length).toBeGreaterThan(0);
  });
});
