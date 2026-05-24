/**
 * P0-016 (usability-audit-day3-2026-05-24):
 * 法令お気に入り localStorage ストアのユニットテスト。
 */

import { describe, expect, test, beforeEach } from "vitest";
import {
  clearFavorites,
  formatArticleCitation,
  formatNoticeCitation,
  isFavorited,
  loadFavorites,
  loadFavoritesByKind,
  removeFavorite,
  toggleFavorite,
} from "./favorites";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  clearFavorites();
});

describe("toggleFavorite + loadFavorites", () => {
  test("空状態で loadFavorites は空配列", () => {
    expect(loadFavorites()).toEqual([]);
  });

  test("条文を追加 → 削除でトグル動作", () => {
    const entry = {
      kind: "article" as const,
      id: "安衛則|第518条",
      title: "作業床の設置等",
      subtitle: "安衛則 第518条",
      href: "/law-search?law=安衛則&art=第518条",
    };
    const r1 = toggleFavorite(entry);
    expect(r1.added).toBe(true);
    expect(isFavorited("article", entry.id)).toBe(true);
    expect(loadFavorites()).toHaveLength(1);

    const r2 = toggleFavorite(entry);
    expect(r2.added).toBe(false);
    expect(isFavorited("article", entry.id)).toBe(false);
    expect(loadFavorites()).toHaveLength(0);
  });

  test("条文と通達が混在しても種別フィルタが効く", () => {
    toggleFavorite({
      kind: "article",
      id: "a1",
      title: "条文1",
      subtitle: "s1",
      href: "/a1",
    });
    toggleFavorite({
      kind: "notice",
      id: "n1",
      title: "通達1",
      subtitle: "s2",
      href: "/n1",
    });
    toggleFavorite({
      kind: "article",
      id: "a2",
      title: "条文2",
      subtitle: "s3",
      href: "/a2",
    });
    expect(loadFavorites()).toHaveLength(3);
    expect(loadFavoritesByKind("article")).toHaveLength(2);
    expect(loadFavoritesByKind("notice")).toHaveLength(1);
  });

  test("removeFavorite で個別削除", () => {
    toggleFavorite({
      kind: "article",
      id: "a1",
      title: "条文1",
      subtitle: "s1",
      href: "/a1",
    });
    toggleFavorite({
      kind: "notice",
      id: "n1",
      title: "通達1",
      subtitle: "s2",
      href: "/n1",
    });
    removeFavorite("article", "a1");
    expect(loadFavorites()).toHaveLength(1);
    expect(loadFavorites()[0].id).toBe("n1");
  });

  test("最大 50 件まで保持 (51件目で最古が落ちる)", () => {
    for (let i = 0; i < 55; i += 1) {
      toggleFavorite({
        kind: "article",
        id: `a${i}`,
        title: `条文${i}`,
        subtitle: `s${i}`,
        href: `/a${i}`,
      });
    }
    expect(loadFavorites()).toHaveLength(50);
  });

  test("clearFavorites で全削除", () => {
    toggleFavorite({
      kind: "article",
      id: "a1",
      title: "条文1",
      subtitle: "s1",
      href: "/a1",
    });
    expect(loadFavorites()).toHaveLength(1);
    clearFavorites();
    expect(loadFavorites()).toHaveLength(0);
  });
});

describe("formatArticleCitation", () => {
  test("基本形式 (全フィールドあり)", () => {
    const out = formatArticleCitation({
      text: "事業者は…作業床を設けなければならない。",
      lawShort: "安衛則",
      lawFull: "労働安全衛生規則",
      articleNum: "第518条",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032",
    });
    expect(out).toContain("「事業者は…作業床を設けなければならない。」");
    expect(out).toContain("労働安全衛生規則（安衛則）第518条");
    expect(out).toContain("出典: https://laws.e-gov.go.jp");
  });

  test("egovUrl なしでも生成可能", () => {
    const out = formatArticleCitation({
      text: "テスト条文",
      lawShort: "安衛法",
      articleNum: "第61条",
    });
    expect(out).toContain("「テスト条文」");
    expect(out).toContain("安衛法第61条");
    expect(out).not.toContain("出典:");
  });
});

describe("formatNoticeCitation", () => {
  test("通達フォーマット", () => {
    const out = formatNoticeCitation({
      title: "足場からの墜落・転落災害防止総合対策推進要綱の改正について",
      issuer: "厚生労働省労働基準局安全衛生部長",
      noticeNumber: "基安発0314第2号",
      issuedDate: "令和5年3月14日",
      url: "https://www.jaish.gr.jp/anzen/hor/hombun/hor1-64/hor1-64-8-1-0.htm",
    });
    expect(out).toContain("「足場からの墜落");
    expect(out).toContain("基安発0314第2号");
    expect(out).toContain("出典: https://www.jaish.gr.jp");
  });

  test("メタなしでもタイトルだけ返す", () => {
    const out = formatNoticeCitation({ title: "通達タイトル" });
    expect(out).toBe("「通達タイトル」");
  });
});
