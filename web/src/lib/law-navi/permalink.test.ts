import { describe, it, expect } from "vitest";
import {
  LAW_NAVI_ENTRIES,
  adjacentEntries,
  articleNumToSlug,
  articlePermalink,
  egovUrlForEntry,
  findEntryByShort,
  resolveLawNaviEntry,
  rewriteLawSearchHrefToPermalink,
} from "./permalink";

// 法令ナビ条文パーマリンク（docs/horei-navi-foundation-2026-07-11 §2-1、T6案A）の機械固定。
// URL は一方通行のドア＝スラグ規則・一意性・解決可能性をここで固定し、幽霊URL 0 を保証する。
describe("articleNumToSlug — スラグ規則", () => {
  it("基条・枝番・項を機械規則で変換する", () => {
    expect(articleNumToSlug("第61条")).toBe("61");
    expect(articleNumToSlug("第151条の67")).toBe("151-67");
    expect(articleNumToSlug("第7条第2項")).toBe("7-p2");
  });

  it("条マーカーの無い指針節番号（第1 等）は null（ページを作らない）", () => {
    expect(articleNumToSlug("第1")).toBeNull();
    expect(articleNumToSlug("")).toBeNull();
  });
});

describe("LAW_NAVI_ENTRIES — 生成集合の健全性", () => {
  it("フォークリフト分野の中核条文を含む十分な規模がある（egovLawId保有46法令分≈712条）", () => {
    expect(LAW_NAVI_ENTRIES.length).toBeGreaterThan(700);
  });

  it("カバレッジ拡大（2026-07-11）: 略称・グルーピング名のコーパス法令も lawShort フォールバックで解決する", () => {
    // 「労働安全衛生規則（足場等）」グルーピング（lawShort=安衛則）→ 安衛則本体の egovLawId
    expect(findEntryByShort("安衛則", "第563条")?.path).toBe("/law-navi/347M50002000032/563");
    expect(findEntryByShort("安衛則", "第539条の2")?.path).toBe("/law-navi/347M50002000032/539-2");
    // 「労働者派遣法(安全衛生関連)」（lawShort=派遣法）
    expect(findEntryByShort("派遣法", "第45条")?.egovLawId).toBe("360AC0000000088");
    // 新規メタデータ法令（e-Gov API 突合済み）
    expect(findEntryByShort("じん肺則", "第2条")?.egovLawId).toBe("335M50002000006");
    expect(findEntryByShort("船員安衛則", "第51条")?.egovLawId).toBe("339M50000800053");
    expect(findEntryByShort("毒劇法", "第17条")?.egovLawId).toBe("325AC0000000303");
  });

  it("e-Gov 法令番号を持たない指針・ガイドライン・通達・協会規程はページを作らない（捏造URLゼロ）", () => {
    const lawsInEntries = new Set(LAW_NAVI_ENTRIES.map((e) => e.article.law));
    for (const excluded of [
      "熱中症対策通達",
      "騒音障害防止指針",
      "振動障害予防指針",
      "建設業労働災害防止規程",
      "メンタルヘルス指針",
      "情報機器作業ガイドライン",
      "化学物質リスクアセスメント指針",
      "健康保持増進指針",
      "過重労働対策通達",
    ]) {
      expect(lawsInEntries.has(excluded), `${excluded} が生成集合に混入`).toBe(false);
    }
  });

  it("スラグは法令内で一意（slug衝突ゼロ）", () => {
    const seen = new Set<string>();
    for (const e of LAW_NAVI_ENTRIES) {
      const key = `${e.egovLawId}/${e.artSlug}`;
      expect(seen.has(key), `重複スラグ: ${key} (${e.article.law} ${e.article.articleNum})`).toBe(false);
      seen.add(key);
    }
  });

  it("全エントリが resolveLawNaviEntry で自身へ逆写像できる（幽霊URL 0）", () => {
    for (const e of LAW_NAVI_ENTRIES) {
      expect(resolveLawNaviEntry(e.egovLawId, e.artSlug)?.article).toBe(e.article);
    }
  });

  it("パスは /law-navi/<egovLawId>/<artSlug> 形式（ASCII安定）", () => {
    for (const e of LAW_NAVI_ENTRIES) {
      expect(e.path).toBe(`/law-navi/${e.egovLawId}/${e.artSlug}`);
      expect(e.path).toMatch(/^\/law-navi\/[0-9A-Za-z]+\/[0-9]+(-[0-9]+)*(-p[0-9]+)?$/);
    }
  });

  it("安衛法・安衛令・安衛則（フォークリフト分野の3法令）が含まれる", () => {
    expect(resolveLawNaviEntry("347AC0000000057", "35")?.article.articleTitle).toBe("重量表示");
    expect(resolveLawNaviEntry("347M50002000032", "151-2")?.article.articleTitle).toContain("車両系荷役運搬機械");
    expect(findEntryByShort("安衛令", "第20条")?.artSlug).toBe("20");
  });
});

describe("rewriteLawSearchHrefToPermalink — O18内部hrefの書換（T6 §6）", () => {
  it("生成集合に在る条文の /law-search href をパーマリンクへ書き換える", () => {
    const href = `/law-search?law=${encodeURIComponent("労働安全衛生法")}&art=${encodeURIComponent("第35条")}`;
    expect(rewriteLawSearchHrefToPermalink(href)).toBe("/law-navi/347AC0000000057/35");
  });

  it("生成集合に無い条文・不明形式はそのまま返す（幽霊リンク 0）", () => {
    const unknown = `/law-search?law=${encodeURIComponent("存在しない法")}&art=${encodeURIComponent("第1条")}`;
    expect(rewriteLawSearchHrefToPermalink(unknown)).toBe(unknown);
    expect(rewriteLawSearchHrefToPermalink("/law-search?q=abc")).toBe("/law-search?q=abc");
    expect(rewriteLawSearchHrefToPermalink("/circulars/mhlw-notice-0001")).toBe("/circulars/mhlw-notice-0001");
  });
});

describe("articlePermalink / adjacentEntries / egovUrlForEntry", () => {
  it("egovLawId を持つ法令の条文はパーマリンクを持ち、持たない法令は null", () => {
    expect(articlePermalink({ law: "労働安全衛生法", articleNum: "第35条" })).toBe(
      "/law-navi/347AC0000000057/35"
    );
    expect(articlePermalink({ law: "存在しない法", articleNum: "第1条" })).toBeNull();
  });

  it("前後条はコーパス収録順で同一法令内に閉じる", () => {
    const entry = findEntryByShort("安衛則", "第151条の3")!;
    const { prev, next } = adjacentEntries(entry);
    expect(prev?.article.law).toBe(entry.article.law);
    expect(next?.article.law).toBe(entry.article.law);
  });

  it("e-Govリンクは基条のみ条アンカー付き・枝番/項付きは法令トップ（誤着地防止）", () => {
    const base = findEntryByShort("安衛法", "第35条")!;
    expect(egovUrlForEntry(base)).toBe("https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_35");
    const branch = findEntryByShort("安衛則", "第151条の2")!;
    expect(egovUrlForEntry(branch)).toBe("https://laws.e-gov.go.jp/law/347M50002000032");
  });
});
