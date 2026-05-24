import { describe, it, expect } from "vitest";
import {
  articleNoticeMap,
  articleNoticeMapStats,
  getNoticeMappingForArticle,
  resolveLeafletById,
  resolveNoticeById,
} from "./article-notice-map";

describe("article-notice-map: 整合性", () => {
  it("通達IDはすべて mhlw-notices.ts に実在する（孤児ID無し）", () => {
    const s = articleNoticeMapStats();
    expect(s.orphanNoticeIds, `孤児 notice ID: ${s.orphanNoticeIds.join(", ")}`).toEqual([]);
  });

  it("リーフレットIDはすべて mhlw-leaflets.ts に実在する（孤児ID無し）", () => {
    const s = articleNoticeMapStats();
    expect(s.orphanLeafletIds, `孤児 leaflet ID: ${s.orphanLeafletIds.join(", ")}`).toEqual([]);
  });

  it("MLIT IDはすべて mlit-resources.ts に実在する（孤児ID無し）", () => {
    const s = articleNoticeMapStats();
    expect(s.orphanMlitIds, `孤児 mlit ID: ${s.orphanMlitIds.join(", ")}`).toEqual([]);
  });

  it("マッピング件数の目安: 条文 40以上、通達 80以上、リーフレット 40以上", () => {
    const s = articleNoticeMapStats();
    console.log(
      `\n[article-notice-map] 条文: ${s.totalArticles}, 通達: ${s.totalNoticeMappings}, リーフレット: ${s.totalLeafletMappings}, MLIT: ${s.totalMlitMappings}`
    );
    expect(s.totalArticles).toBeGreaterThanOrEqual(40);
    expect(s.totalNoticeMappings).toBeGreaterThanOrEqual(80);
    expect(s.totalLeafletMappings).toBeGreaterThanOrEqual(40);
  });
});

describe("getNoticeMappingForArticle", () => {
  it("生キーで完全一致する", () => {
    const m = getNoticeMappingForArticle("安衛則", "第563条");
    expect(m).toBeDefined();
    expect(m?.notices?.length).toBeGreaterThan(0);
    expect(m?.leaflets?.length).toBeGreaterThan(0);
  });

  it("漢数字表記でも正規化キーで検索成功する", () => {
    // 第五百六十三条 → 第563条 にフォールバック
    const m = getNoticeMappingForArticle("安衛則", "第五百六十三条");
    expect(m).toBeDefined();
  });

  it("未登録条文は undefined", () => {
    const m = getNoticeMappingForArticle("安衛則", "第99999条");
    expect(m).toBeUndefined();
  });

  it("未登録法令は undefined", () => {
    const m = getNoticeMappingForArticle("ARCHAIC_LAW", "第1条");
    expect(m).toBeUndefined();
  });
});

describe("resolveNoticeById / resolveLeafletById", () => {
  it("既知の通達IDから MhlwNotice を取得できる", () => {
    const n = resolveNoticeById("mhlw-notice-0001");
    expect(n).toBeDefined();
    expect(n?.id).toBe("mhlw-notice-0001");
  });

  it("未知の通達IDは undefined", () => {
    expect(resolveNoticeById("mhlw-notice-99999")).toBeUndefined();
  });

  it("既知のリーフレットIDから MhlwLeaflet を取得できる", () => {
    const l = resolveLeafletById("mhlw-leaflet-0091");
    expect(l).toBeDefined();
    expect(l?.id).toBe("mhlw-leaflet-0091");
  });
});

describe("article-notice-map: トピック別カバレッジ", () => {
  it("足場関連条文（518/519/520/563/564/575）が登録されている", () => {
    expect(getNoticeMappingForArticle("安衛則", "第518条")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛則", "第519条")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛則", "第520条")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛則", "第563条")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛則", "第564条")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛則", "第575条")).toBeDefined();
  });

  it("化学物質関連（安衛法57-57の3）が登録されている", () => {
    expect(getNoticeMappingForArticle("安衛法", "第57条")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛法", "第57条の2")).toBeDefined();
    expect(getNoticeMappingForArticle("安衛法", "第57条の3")).toBeDefined();
  });

  it("熱中症（安衛則612条の2・624条）が登録されている", () => {
    const r612 = getNoticeMappingForArticle("安衛則", "第612条の2");
    expect(r612).toBeDefined();
    expect(r612?.notices?.length).toBeGreaterThanOrEqual(3);
    expect(getNoticeMappingForArticle("安衛則", "第624条")).toBeDefined();
  });

  it("石綿（石綿則3-4の2）が登録されている", () => {
    expect(getNoticeMappingForArticle("石綿則", "第3条")).toBeDefined();
    expect(getNoticeMappingForArticle("石綿則", "第4条")).toBeDefined();
    expect(getNoticeMappingForArticle("石綿則", "第4条の2")).toBeDefined();
  });

  it("メンタル（安衛法66条の10）が登録されている", () => {
    const m = getNoticeMappingForArticle("安衛法", "第66条の10");
    expect(m).toBeDefined();
    expect(m?.notices?.length).toBeGreaterThanOrEqual(2);
    expect(m?.leaflets?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("articleNoticeMap: 重複・空エントリ", () => {
  it("空エントリ（notices/leaflets/mlitResources すべて空）を持たない", () => {
    for (const [key, entry] of Object.entries(articleNoticeMap)) {
      const n = entry.notices?.length ?? 0;
      const l = entry.leaflets?.length ?? 0;
      const m = entry.mlitResources?.length ?? 0;
      // 空エントリは情報密度が無いので除去すべき。例外は明示。
      expect(n + l + m, `${key} が空エントリ`).toBeGreaterThan(0);
    }
  });
});
