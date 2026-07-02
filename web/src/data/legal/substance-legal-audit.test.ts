/**
 * 特別則タグ×正本スナップショットの全件突合（F2 CIゲート）
 *
 * 6月のコーパス条番号監査（article-caption-integrity.test.ts）の物質×法令区分版。
 * ここが落ちたら「サイトの特別則表示が e-Gov 現行条文から導出できない」＝誤区分の混入。
 * 対処は (1) 表示データの是正、(2) 法改正なら scripts/etl/build-anei-beppyo-snapshot.mjs を
 * 再実行してスナップショットを更新し cas-law-index.ts を再レビュー、のどちらか。
 * 期待値をこのテスト側で緩めることは禁止（正本が唯一の真実）。
 */
import { describe, expect, it } from "vitest";

import {
  OSHA_REGULATION_TAGS_BY_CAS,
  SPECIAL_CONTROL_CAS_SET,
  REGULATION_TAGS,
  type RegulationTag,
} from "@/lib/regulation-tag-labels";
import { chemicalSubstances } from "@/data/mock/chemical-substances-db";
import {
  BEPPYO3_CLASS1,
  BEPPYO3_CLASS3,
  BEPPYO6_2,
  YUKI1_GO,
  YUKI2_GO,
  SPECIAL_CONTROL_GO2,
  ARTICLE22_ITEM3_TEXT,
} from "./anei-beppyo-snapshot";
import {
  auditIndexIntegrity,
  auditSpecialRuleClaims,
  claimsFromOshaTagMap,
  claimsFromMockCategories,
} from "./substance-legal-audit";
import { isTokkaKenshinExcluded, deriveAneiDesignations } from "./substance-legal-profile";

const fmt = (v: { message: string; source: string }[]) =>
  v.map((x) => `[${x.source}] ${x.message}`).join("\n");

describe("cas-law-index の自己検査（号参照とスナップショットの一致）", () => {
  it("全エントリの号参照が実在し名称が一致する", () => {
    const violations = auditIndexIntegrity();
    expect(violations, fmt(violations)).toEqual([]);
  });
});

describe("特別則タグの正本突合（偽陽性・偽陰性の両方向）", () => {
  it("regulation-tag-labels の OSHA タグ＋特別管理物質セットが全件正本と一致する", () => {
    const claims = claimsFromOshaTagMap(OSHA_REGULATION_TAGS_BY_CAS, SPECIAL_CONTROL_CAS_SET);
    const violations = auditSpecialRuleClaims(claims);
    expect(violations, fmt(violations)).toEqual([]);
  });

  it("mock 50物質の categories（特化則/有機則/特別管理物質）が全件正本と一致する", () => {
    const claims = claimsFromMockCategories(chemicalSubstances);
    const violations = auditSpecialRuleClaims(claims);
    expect(violations, fmt(violations)).toEqual([]);
  });

  it("機械突合対象外タグ（鉛則・四アルキル鉛則）は人手検証済みCASにのみ付与される", () => {
    // 鉛則・四アルキル鉛則は令別表第4/第5（業務列挙）のため v1 スナップショットから導出不能。
    // 付与先を固定し、無検証の拡散を防ぐ（拡張時はこのリストと index の notes を更新）。
    const namari = Object.entries(OSHA_REGULATION_TAGS_BY_CAS)
      .filter(([, tags]) => tags.includes("namari"))
      .map(([cas]) => cas);
    const yonalkyl = Object.entries(OSHA_REGULATION_TAGS_BY_CAS)
      .filter(([, tags]) => tags.includes("yonalkyl"))
      .map(([cas]) => cas);
    expect(namari).toEqual(["7439-92-1"]); // 鉛
    expect(yonalkyl).toEqual(["78-00-2"]); // 四アルキル鉛
    expect(chemicalSubstances.filter((s) => s.categories.includes("鉛則")).map((s) => s.cas)).toEqual(
      ["7439-92-1"],
    );
    expect(
      chemicalSubstances.filter((s) => s.categories.includes("四アルキル鉛則")).map((s) => s.cas),
    ).toEqual(["78-00-2"]);
  });

  it("OSHAタグ表のタグは全て語彙（REGULATION_TAGS）に定義済み", () => {
    for (const [cas, tags] of Object.entries(OSHA_REGULATION_TAGS_BY_CAS)) {
      for (const t of tags) {
        expect(REGULATION_TAGS[t as RegulationTag], `${cas} の未定義タグ: ${t}`).toBeDefined();
      }
    }
  });
});

describe("再発見テスト: 過去の誤マッピングを同じ監査が全件検出できる", () => {
  it("PR#578 是正前の regulation-tag-labels の6点（診断03 候補1）を検出する", () => {
    // 2026-07-02 是正前に本番表示されていた実データ（診断03 §2-1）
    const pre578Tags: Record<string, RegulationTag[]> = {
      "7782-50-5": ["tokutei-3"], // 塩素（正: 第二類）
      "7664-39-3": ["tokutei-3"], // フッ化水素（正: 第二類）
      "67-66-3": ["yuki-1"], // クロロホルム（正: 特化則第二類・特別有機溶剤）
      "56-23-5": ["yuki-1"], // 四塩化炭素（同上）
    };
    const pre578Special = new Set<string>([
      "75-09-2",
      "71-43-2",
      "79-06-1", // アクリルアミド（正: 特別管理物質ではない）
      "50-00-0",
      "75-21-8",
      "127-18-4",
      "79-01-6",
      // クロロホルム(67-66-3)・四塩化炭素(56-23-5) の欠落も当時の実データ
    ]);
    const violations = auditSpecialRuleClaims(
      claimsFromOshaTagMap(pre578Tags, pre578Special, "pre-578-fixture"),
    );
    const kindsOf = (cas: string) => violations.filter((v) => v.cas === cas).map((v) => v.kind);
    // 1. 塩素 第三類→第二類
    expect(kindsOf("7782-50-5")).toContain("tokka-overclaim");
    expect(kindsOf("7782-50-5")).toContain("tokka-missing");
    // 2. フッ化水素 第三類→第二類
    expect(kindsOf("7664-39-3")).toContain("tokka-overclaim");
    expect(kindsOf("7664-39-3")).toContain("tokka-missing");
    // 3. クロロホルム 有機則第一種→特化則第二類＋特別管理物質
    expect(kindsOf("67-66-3")).toContain("yuki-overclaim");
    expect(kindsOf("67-66-3")).toContain("tokka-missing");
    expect(kindsOf("67-66-3")).toContain("special-missing");
    // 4. 四塩化炭素 同上
    expect(kindsOf("56-23-5")).toContain("yuki-overclaim");
    expect(kindsOf("56-23-5")).toContain("tokka-missing");
    expect(kindsOf("56-23-5")).toContain("special-missing");
    // 5. アクリルアミドの特別管理物質 誤付与
    expect(kindsOf("79-06-1")).toContain("special-overclaim");
  });

  it("PR#584 是正前の mock categories の代表誤り（診断03 候補2）を検出する", () => {
    // 是正前の実データ（抜粋）: 「発がん性が強い＝第一類」誤解＋非収載物質への付与
    const pre584 = [
      { id: "cs-007", name: "六価クロム化合物", cas: "18540-29-9", categories: ["特化則1類", "特別管理物質"] },
      { id: "cs-008", name: "カドミウム及びその化合物", cas: "7440-43-9", categories: ["特化則1類", "特別管理物質"] },
      { id: "cs-010", name: "石綿", cas: "1332-21-4", categories: ["特化則1類", "石綿則"] },
      { id: "cs-016", name: "塩素", cas: "7782-50-5", categories: ["特化則3類"] },
      { id: "cs-032", name: "1,3-ブタジエン", cas: "106-99-0", categories: ["特化則2類", "特別管理物質"] },
      { id: "cs-046", name: "MDI", cas: "101-68-8", categories: ["特化則2類"] },
    ];
    const violations = auditSpecialRuleClaims(claimsFromMockCategories(pre584, "pre-584-fixture"));
    const kindsOf = (cas: string) => violations.filter((v) => v.cas === cas).map((v) => v.kind);
    expect(kindsOf("18540-29-9")).toEqual(
      expect.arrayContaining(["tokka-overclaim", "tokka-missing"]), // 1類→2類
    );
    expect(kindsOf("7440-43-9")).toEqual(
      expect.arrayContaining(["tokka-overclaim", "tokka-missing", "special-overclaim"]),
    );
    expect(kindsOf("1332-21-4")).toContain("tokka-overclaim"); // 令別表第3非収載
    expect(kindsOf("7782-50-5")).toEqual(expect.arrayContaining(["tokka-overclaim", "tokka-missing"]));
    expect(kindsOf("106-99-0")).toEqual(expect.arrayContaining(["tokka-overclaim", "special-overclaim"]));
    expect(kindsOf("101-68-8")).toContain("tokka-overclaim");
  });

  it("正本と未突合のCASに特別則タグを付けると index-missing で落ちる（手書きマッピングの侵入防止）", () => {
    const violations = auditSpecialRuleClaims(
      claimsFromOshaTagMap({ "999-99-9": ["tokutei-2"] }, new Set(), "intrusion-fixture"),
    );
    expect(violations.map((v) => v.kind)).toContain("index-missing");
  });
});

describe("解説文とスナップショットの整合（12年遅れ解説の再発防止）", () => {
  it("yuki-1 の解説は現行の第一種有機溶剤（スナップショット導出）と整合する", () => {
    const summary = REGULATION_TAGS["yuki-1"].summary;
    expect(YUKI1_GO.length).toBe(2);
    const names = BEPPYO6_2.filter((e) => YUKI1_GO.includes(e.go)).map((e) => e.name);
    expect(names.some((n) => n.includes("ジクロルエチレン"))).toBe(true);
    expect(names.some((n) => n.includes("二硫化炭素"))).toBe(true);
    expect(summary).toContain(`${YUKI1_GO.length}物質`);
    expect(summary).toContain("ジクロルエチレン");
    expect(summary).toContain("二硫化炭素");
  });

  it("tokutei-3 の解説の物質列挙は令別表第3第3号の全8物質と一致する", () => {
    const substances = BEPPYO3_CLASS3.filter((e) => !e.isPreparation);
    expect(substances.length).toBe(8);
    const summary = REGULATION_TAGS["tokutei-3"].summary.replace(/ェ/g, "エ");
    for (const s of substances) {
      expect(summary, `第三類の解説に「${s.name}」が無い`).toContain(s.name.replace(/ェ/g, "エ"));
    }
    expect(REGULATION_TAGS["tokutei-3"].summary).toContain(`${substances.length}種`);
  });
});

describe("特化則健診（特化則39条・令22条1項3号）の対象導出", () => {
  it("原文ガード: 健診対象は別表第3第1号・第2号のみ＝第三類は対象外（改正で文言が変わればここで検知）", () => {
    expect(ARTICLE22_ITEM3_TEXT).toMatch(/別表第三第一号若しくは第二号/);
    expect(ARTICLE22_ITEM3_TEXT).toMatch(/同号５及び３１の２に掲げる物/);
  });

  it("エチレンオキシド・ホルムアルデヒドは第二類だが健診対象から明示除外", () => {
    expect(isTokkaKenshinExcluded("75-21-8")).toBe(true);
    expect(isTokkaKenshinExcluded("50-00-0")).toBe(true);
  });

  it("第三類（硫酸・硝酸・塩化水素等）は特化則健診の対象外", () => {
    for (const cas of ["7664-93-9", "7697-37-2", "7647-01-0", "7664-41-7", "630-08-0"]) {
      expect(isTokkaKenshinExcluded(cas), cas).toBe(true);
    }
  });

  it("通常の第一類・第二類（ベンゼン・ベリリウム等）は健診対象", () => {
    for (const cas of ["71-43-2", "7440-41-7", "67-66-3", "7782-50-5"]) {
      expect(isTokkaKenshinExcluded(cas), cas).toBe(false);
      expect(deriveAneiDesignations(cas)?.tokkaKenshinTarget, cas).toBe(true);
    }
  });
});

describe("スナップショットの健全性（公知の件数との一致）", () => {
  it("第一類7物質・第三類8物質・有機溶剤44物質（第一種2・第二種35・第三種7）", () => {
    expect(BEPPYO3_CLASS1.filter((e) => !e.isPreparation).length).toBe(7);
    expect(BEPPYO3_CLASS3.filter((e) => !e.isPreparation).length).toBe(8);
    const solvents = BEPPYO6_2.filter((e) => !e.isMixture);
    expect(solvents.length).toBe(44);
    expect(YUKI1_GO.length).toBe(2);
    expect(YUKI2_GO.length).toBe(35);
    expect(solvents.length - YUKI1_GO.length - YUKI2_GO.length).toBe(7);
  });

  it("特別管理物質の号展開が既知の代表と一致する", () => {
    // クロロホルム(11の2)・四塩化炭素(18の2)は含む、カドミウム(10)・硫化水素(35)・溶接ヒューム(34の2)は含まない
    expect(SPECIAL_CONTROL_GO2).toContain("11の2");
    expect(SPECIAL_CONTROL_GO2).toContain("18の2");
    expect(SPECIAL_CONTROL_GO2).not.toContain("10");
    expect(SPECIAL_CONTROL_GO2).not.toContain("35");
    expect(SPECIAL_CONTROL_GO2).not.toContain("34の2");
  });
});
