import { describe, it, expect } from "vitest";
import {
  ARTICLE_NOTICE_MAP,
  ARTICLE_NOTICE_MAP_COUNT,
  lookupArticleNoticeMap,
  getAllArticleNoticeKeys,
} from "./article-notice-map";
import { mhlwNotices } from "./mhlw-notices";
import { mhlwLeaflets } from "./mhlw-leaflets";

describe("Phase 4: article-notice-map データ整合性", () => {
  it("マッピング件数が 50 件以上 (建設業頻出条文を網羅)", () => {
    expect(ARTICLE_NOTICE_MAP_COUNT).toBeGreaterThanOrEqual(50);
  });

  it("各エントリの articleKey が一意", () => {
    const keys = ARTICLE_NOTICE_MAP.map((e) => e.articleKey);
    const set = new Set(keys);
    expect(set.size).toBe(keys.length);
  });

  it("各エントリの noticeIds は mhlw-notices に実在 (架空ID なし)", () => {
    const ids = new Set(mhlwNotices.map((n) => n.id));
    for (const e of ARTICLE_NOTICE_MAP) {
      for (const nid of e.noticeIds) {
        expect(ids.has(nid), `notice id ${nid} not in mhlw-notices (article ${e.articleKey})`).toBe(true);
      }
    }
  });

  it("各エントリの leafletIds は mhlw-leaflets に実在", () => {
    const ids = new Set(mhlwLeaflets.map((l) => l.id));
    for (const e of ARTICLE_NOTICE_MAP) {
      for (const lid of e.leafletIds) {
        expect(ids.has(lid), `leaflet id ${lid} not in mhlw-leaflets (article ${e.articleKey})`).toBe(true);
      }
    }
  });

  it("articleKey は 'lawShort|articleNumKey' 形式", () => {
    for (const e of ARTICLE_NOTICE_MAP) {
      expect(e.articleKey).toMatch(/^[^|]+\|[\d\-A-Za-z]+$/);
    }
  });
});

describe("Phase 4: lookupArticleNoticeMap()", () => {
  it("安衛則|563 (足場手すり) で関連通達が取得できる", () => {
    const r = lookupArticleNoticeMap("安衛則|563");
    expect(r.entry).not.toBeNull();
    expect(r.notices.length).toBeGreaterThan(0);
    // construction カテゴリの通達が含まれる
    expect(r.notices.every((n) => n.category === "construction")).toBe(true);
  });

  it("安衛則|612-2 (熱中症) で 3 件以上の関連通達", () => {
    const r = lookupArticleNoticeMap("安衛則|612-2");
    expect(r.entry).not.toBeNull();
    expect(r.notices.length).toBeGreaterThanOrEqual(3);
  });

  it("安衛法|57-3 (化学物質RA) で chemicals 関連通達が返る", () => {
    const r = lookupArticleNoticeMap("安衛法|57-3");
    expect(r.entry).not.toBeNull();
    expect(r.notices.length).toBeGreaterThan(0);
    expect(r.notices.some((n) => n.category === "chemicals")).toBe(true);
  });

  it("未登録のキーでは entry null + 空配列", () => {
    const r = lookupArticleNoticeMap("未知の法令|999999");
    expect(r.entry).toBeNull();
    expect(r.notices).toEqual([]);
    expect(r.leaflets).toEqual([]);
    expect(r.mlitResources).toEqual([]);
  });

  it("maxNotices で件数制限", () => {
    const r = lookupArticleNoticeMap("安衛則|563", 2);
    expect(r.notices.length).toBeLessThanOrEqual(2);
  });

  it("getAllArticleNoticeKeys() が登録済キーを返す", () => {
    const keys = getAllArticleNoticeKeys();
    expect(keys).toContain("安衛則|563");
    expect(keys).toContain("安衛法|57-3");
    expect(keys).toContain("石綿則|3");
    expect(keys.length).toBe(ARTICLE_NOTICE_MAP_COUNT);
  });
});

describe("Phase 4: 建設業頻出 5 トピックがマッピング済", () => {
  const REQUIRED_TOPICS = [
    { key: "安衛則|563", topic: "足場手すり" },
    { key: "安衛則|520", topic: "墜落制止用器具" },
    { key: "安衛法|57-3", topic: "化学物質RA" },
    { key: "石綿則|3", topic: "石綿事前調査" },
    { key: "クレーン則|34", topic: "クレーン定期自主検査" },
  ];
  for (const { key, topic } of REQUIRED_TOPICS) {
    it(`${topic} (${key}) がマッピング済`, () => {
      const r = lookupArticleNoticeMap(key);
      expect(r.entry).not.toBeNull();
    });
  }
});
