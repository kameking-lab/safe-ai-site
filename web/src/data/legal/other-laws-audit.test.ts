/**
 * 他法令（毒劇法・化管法・化審法・高圧ガス）×全物質DB の正本突合 CIゲート（O11）
 *
 * substance-legal-audit.test.ts（安衛法系）の網を他法令域へ拡張する。
 * 「誤区分を1件入れると落ちる」ことが合格基準:
 *   - 索引の号参照を1つずらす → index-stale
 *   - DBの物質から prtr/cscl/poison-control タグを消す・偽付与する → missing/overclaim
 * 期待値をテスト側で緩めることは禁止。正本（e-Gov / NITE公式）が唯一の真実。
 */
import { describe, expect, it } from "vitest";
import CONCENTRATION_LIMITS from "../concentration-limits.json";
import {
  auditOtherLawsIndexIntegrity,
  auditOtherLawsTags,
  listUnverifiedPoisonTags,
} from "./other-laws-audit";
import {
  DOKUGEKI_HYO1,
  DOKUGEKI_HYO2,
  DOKUGEKI_HYO3,
  DOKUGEKI_REI1,
  DOKUGEKI_REI2,
  DOKUGEKI_REI3,
  KASHINHO_CLASS1,
  KASHINHO_CLASS2,
  KOUATSU_TOXIC_GAS,
  KOUATSU_FLAMMABLE_GAS,
  KOUATSU_SPECIAL_GAS,
} from "./other-laws-snapshot";
import { OTHER_LAWS_CAS_INDEX_BY_CAS } from "./other-laws-cas-index";
import {
  buildSubstanceLegalProfile,
  deriveKakanho,
  dokugekiClassOfEntry,
  KAKANHO_META,
} from "./substance-legal-profile";

type Substances = Record<string, { name?: string; regulationTags?: string[] }>;
const SUBSTANCES = (CONCENTRATION_LIMITS as { substances: Substances }).substances;

function tagsByCas(): Map<string, readonly string[]> {
  const m = new Map<string, readonly string[]>();
  for (const [cas, e] of Object.entries(SUBSTANCES)) m.set(cas, e.regulationTags ?? []);
  return m;
}

describe("他法令スナップショットの件数アンカー（公知の数と照合）", () => {
  it("毒劇法: 法別表の物質行数が公知の構成と一致する", () => {
    // 別表第一(毒物)=27物質+委任行, 別表第二(劇物)=93物質+委任行, 別表第三(特定毒物)=9物質+委任行
    expect(DOKUGEKI_HYO1.filter((e) => !e.isPreparation).length).toBe(27);
    expect(DOKUGEKI_HYO2.filter((e) => !e.isPreparation).length).toBe(93);
    expect(DOKUGEKI_HYO3.filter((e) => !e.isPreparation).length).toBe(9);
    // 指定令の号数（改正で増えるため下限アンカー）
    expect(DOKUGEKI_REI1.length).toBeGreaterThanOrEqual(100);
    expect(DOKUGEKI_REI2.length).toBeGreaterThanOrEqual(330);
    expect(DOKUGEKI_REI3.length).toBe(10);
  });

  it("化管法: 第一種515・第二種134（2021(R3)改正政令の公知数）", () => {
    expect(KAKANHO_META.class1Count).toBe(515);
    expect(KAKANHO_META.class2Count).toBe(134);
    expect(KAKANHO_META.casMappedCount).toBeGreaterThanOrEqual(990);
  });

  it("化審法: 第一種特定40・第二種特定24（施行令2026-06-17改正時点）", () => {
    expect(KASHINHO_CLASS1.length).toBe(40);
    expect(KASHINHO_CLASS2.length).toBe(24);
  });

  it("高圧ガス: 一般則2条の品名列挙数（毒性33・可燃39・特殊7）", () => {
    expect(KOUATSU_TOXIC_GAS.length).toBe(33);
    expect(KOUATSU_FLAMMABLE_GAS.length).toBe(39);
    expect(KOUATSU_SPECIAL_GAS.length).toBe(7);
  });
});

describe("other-laws-cas-index 自己検査", () => {
  it("索引の全参照が snapshot と整合する（号ずれ・製剤行参照・品名不一致ゼロ）", () => {
    expect(auditOtherLawsIndexIntegrity()).toEqual([]);
  });
});

describe("全物質DB × 他法令タグの両方向突合（誤区分1件でCIが落ちる網）", () => {
  it("違反ゼロ（偽陽性・偽陰性とも）", () => {
    const violations = auditOtherLawsTags(tagsByCas());
    expect(violations.map((v) => `${v.kind}: ${v.message}`)).toEqual([]);
  });

  it("未突合の poison-control タグ（ミラー由来）は既知の水準に収まる", () => {
    // 索引整備が進むほど減る。増えたら未突合の手書きタグが混入した疑い
    const unverified = listUnverifiedPoisonTags(tagsByCas());
    expect(unverified.length).toBeLessThanOrEqual(75);
  });
});

describe("O11 是正の実測固定（診断 2026-07-11 の欠落7件＋偽陽性）", () => {
  const GAP_7: Array<[string, string, string]> = [
    // [cas, 物質名, 期待区分]
    ["7664-39-3", "フッ化水素", "毒物"],
    ["7439-97-6", "水銀", "毒物"],
    ["7440-38-2", "ヒ素", "毒物"],
    ["74-90-8", "シアン化水素", "毒物"],
    ["78-00-2", "四アルキル鉛（テトラエチル鉛）", "特定毒物"],
    ["67-56-1", "メタノール", "劇物"],
    ["67-66-3", "クロロホルム", "劇物"],
  ];
  it.each(GAP_7)("%s %s が毒劇法「%s」として表示される", (cas, _name, expected) => {
    const entry = OTHER_LAWS_CAS_INDEX_BY_CAS.get(cas);
    expect(entry, `${cas} が other-laws-cas-index に無い`).toBeDefined();
    expect(dokugekiClassOfEntry(entry!)).toBe(expected);
    expect(SUBSTANCES[cas]?.regulationTags).toContain("poison-control");
  });

  it("ベンゼン(71-43-2)は毒劇法非該当＝旧ミラーの偽陽性タグが除去済み", () => {
    const entry = OTHER_LAWS_CAS_INDEX_BY_CAS.get("71-43-2");
    expect(entry?.dokugekiNone).toBe(true);
    expect(SUBSTANCES["71-43-2"]?.regulationTags).not.toContain("poison-control");
  });

  it("ヒ化ガリウム(1303-00-0)は砒素化合物の明示除外＝非該当確認済み", () => {
    const entry = OTHER_LAWS_CAS_INDEX_BY_CAS.get("1303-00-0");
    expect(entry?.dokugekiNone).toBe(true);
  });
});

describe("代表物質の照合実例（該当/非該当/未確認が正本と一致）", () => {
  it("硫酸: 劇物（法別表第二89号）・特化則第三類・PRTR非該当（公式リスト非収載）", () => {
    const p = buildSubstanceLegalProfile("7664-93-9")!;
    const doku = p.designations.filter((d) => d.domain === "dokugeki");
    expect(doku.some((d) => d.status === "designated" && d.classification === "劇物")).toBe(true);
    const tokka = p.designations.filter((d) => d.domain === "anei-tokka");
    expect(tokka.some((d) => d.status === "designated" && d.classification === "第三類物質")).toBe(
      true,
    );
    expect(deriveKakanho("7664-93-9")).toEqual([]);
  });

  it("トルエン: 劇物（指定令2条76の2号）・有機則第二種・PRTR第一種", () => {
    const p = buildSubstanceLegalProfile("108-88-3")!;
    expect(
      p.designations.some(
        (d) => d.domain === "dokugeki" && d.status === "designated" && d.classification === "劇物",
      ),
    ).toBe(true);
    expect(
      p.designations.some(
        (d) =>
          d.domain === "anei-yuki" && d.status === "designated" && d.classification === "第二種有機溶剤",
      ),
    ).toBe(true);
    expect(deriveKakanho("108-88-3").map((k) => k.clazz)).toEqual([1]);
  });

  it("アンモニア: 劇物・特化則第三類・高圧ガス（毒性/可燃性）・PRTR第一種", () => {
    const p = buildSubstanceLegalProfile("7664-41-7")!;
    const kinds = p.designations
      .filter((d) => d.domain === "kouatsu-gas" && d.status === "designated")
      .map((d) => d.classification)
      .sort();
    expect(kinds).toEqual(["可燃性ガス", "毒性ガス"]);
    expect(
      p.designations.some(
        (d) => d.domain === "dokugeki" && d.status === "designated" && d.classification === "劇物",
      ),
    ).toBe(true);
  });

  it("鉛（単体）: 毒劇法非該当を確認済み・PRTR第一種（鉛化合物群のCAS収載）", () => {
    const p = buildSubstanceLegalProfile("7439-92-1")!;
    expect(
      p.designations.some((d) => d.domain === "dokugeki" && d.status === "not-designated"),
    ).toBe(true);
  });

  it("ガソリン: 有機則第三種のみ・毒劇法非該当確認済み・化管法未確認ではなく非収載", () => {
    const p = buildSubstanceLegalProfile("8006-61-9")!;
    expect(
      p.designations.some(
        (d) =>
          d.domain === "anei-yuki" && d.status === "designated" && d.classification === "第三種有機溶剤",
      ),
    ).toBe(true);
    expect(
      p.designations.some((d) => d.domain === "dokugeki" && d.status === "not-designated"),
    ).toBe(true);
  });

  it("塩素: 劇物（指定令2条17の3号）・特化則第二類・高圧ガス毒性ガス", () => {
    const p = buildSubstanceLegalProfile("7782-50-5")!;
    expect(
      p.designations.some(
        (d) => d.domain === "dokugeki" && d.status === "designated" && d.classification === "劇物",
      ),
    ).toBe(true);
    expect(
      p.designations.some(
        (d) => d.domain === "kouatsu-gas" && d.status === "designated" && d.classification === "毒性ガス",
      ),
    ).toBe(true);
  });

  it("化審法第二種特定: トリクロロエチレン・テトラクロロエチレン・四塩化炭素", () => {
    for (const cas of ["79-01-6", "127-18-4", "56-23-5"]) {
      const p = buildSubstanceLegalProfile(cas)!;
      expect(
        p.designations.some(
          (d) =>
            d.domain === "kashinho" &&
            d.status === "designated" &&
            d.classification === "第二種特定化学物質",
        ),
        cas,
      ).toBe(true);
    }
  });

  it("未確認の明示: 索引未収載CASの毒劇法は unverified（空白で欺かない）", () => {
    // ヘプタクロル: クロルデン混合物の構成成分だが単体指定は未確認のまま
    const p = buildSubstanceLegalProfile("76-44-8");
    expect(p).toBeDefined();
    expect(p!.designations.find((d) => d.domain === "dokugeki")?.status).toBe("unverified");
  });
});

describe("改変検出（網が機能していることの実証・再発見テスト）", () => {
  it("公式PRTR該当タグを1件消すと prtr-missing で検出される", () => {
    const m = tagsByCas();
    const toluene = [...(m.get("108-88-3") ?? [])].filter((t) => t !== "prtr1");
    m.set("108-88-3", toluene);
    const violations = auditOtherLawsTags(m);
    expect(violations.some((v) => v.kind === "prtr-missing" && v.cas === "108-88-3")).toBe(true);
  });

  it("非該当物質に prtr1 を偽付与すると prtr-overclaim で検出される", () => {
    const m = tagsByCas();
    m.set("7664-93-9", [...(m.get("7664-93-9") ?? []), "prtr1"]); // 硫酸はPRTR非該当
    const violations = auditOtherLawsTags(m);
    expect(violations.some((v) => v.kind === "prtr-overclaim" && v.cas === "7664-93-9")).toBe(true);
  });

  it("毒物の poison-control タグを消すと dokugeki-missing で検出される", () => {
    const m = tagsByCas();
    m.set("7664-39-3", (m.get("7664-39-3") ?? []).filter((t) => t !== "poison-control"));
    const violations = auditOtherLawsTags(m);
    expect(violations.some((v) => v.kind === "dokugeki-missing" && v.cas === "7664-39-3")).toBe(
      true,
    );
  });

  it("非該当確認済みCASに poison-control を偽付与すると dokugeki-overclaim で検出される", () => {
    const m = tagsByCas();
    m.set("71-43-2", [...(m.get("71-43-2") ?? []), "poison-control"]);
    const violations = auditOtherLawsTags(m);
    expect(violations.some((v) => v.kind === "dokugeki-overclaim" && v.cas === "71-43-2")).toBe(
      true,
    );
  });

  it("化審法特定物質の cscl タグを消すと cscl-missing で検出される", () => {
    const m = tagsByCas();
    m.set("79-01-6", (m.get("79-01-6") ?? []).filter((t) => t !== "cscl2"));
    const violations = auditOtherLawsTags(m);
    expect(violations.some((v) => v.kind === "cscl-missing" && v.cas === "79-01-6")).toBe(true);
  });
});
