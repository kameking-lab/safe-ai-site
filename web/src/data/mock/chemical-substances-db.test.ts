/**
 * 精選50物質DB（chemical-substances-db.ts）の特別則区分 整合テスト（柱1是正の恒久固定）
 *
 * 2026-07-02 の是正（Fable診断03 テーマ3・候補2／BACKLOG-data O1）を恒久固定する。
 * 区分の根拠は e-Gov 法令API 現行条文（2026-07-02 機械取得）:
 *   - 安衛法施行令 別表第3（347CO0000000318）… 特化則の第一類/第二類/第三類物質の列挙
 *   - 特化則 第38条の4（347M50002000039）… 特別管理物質の該当号（作業記録30年保存）
 *
 * 是正前に本番表示されていた偽陽性の再混入を防ぐ:
 *   - 「発がん性が強い＝第一類」という誤解（六価クロム/カドミウム/ヒ素/塩化ビニル/コールタール/石綿を1類に）
 *   - 「酸・刺激性ガス＝第三類」という誤解（塩素を3類に）
 *   - 令別表第3に非収載の物質（石綿=石綿則／1,3-ブタジエン=特化則38条の17／MDI）への特化則区分付与
 *   - カドミウムの特別管理物質（38条の4の号に非該当）誤付与
 */
import { describe, expect, it } from "vitest";
import { chemicalSubstances, type ChemicalCategory } from "./chemical-substances-db";

/**
 * 令別表第3 第一類物質（e-Gov 施行令別表第3第1号 現行7物質・2026-07-02取得）。
 * 精選50物質のうち、この集合に属するのは ベリリウム（cs-035）のみ。
 * ＝ これ以外のCASに「特化則1類」が付いていたら偽陽性。
 */
const FIRST_CLASS_CAS = new Set<string>([
  "7440-41-7", // ベリリウム及びその化合物（別表第3第1号6）
  // 他の6物質（ジクロルベンジジン/α-ナフチルアミン/PCB/o-トリジン/ジアニシジン/
  //           ベンゾトリクロリド）は精選50物質に非収録
]);

/**
 * 令別表第3に非収載＝特化則（1〜3類）を一切付与してはならない物質（e-Gov 2026-07-02）。
 * 石綿は石綿則（安衛法55条・令16条）、1,3-ブタジエンは特化則38条の17の特例措置、
 * MDIは特化則対象外（対象はTDI＝別表第3第2号23）。
 */
const NOT_IN_APPENDIX3_CAS = new Set<string>([
  "1332-21-4", // 石綿
  "106-99-0", // 1,3-ブタジエン
  "101-68-8", // メチレンビス(4,1-フェニレン)ジイソシアネート（MDI）
]);

/**
 * 特化則の正しい区分（e-Gov 施行令別表第3・2026-07-02突合）。号番号は根拠。
 * key=CAS, value={ 期待区分, 号 }
 */
const EXPECTED_TOKKA_CLASS: Record<string, { category: ChemicalCategory; go: string }> = {
  "18540-29-9": { category: "特化則2類", go: "第2号11 クロム酸及びその塩／第2号21 重クロム酸及びその塩" },
  "7440-43-9": { category: "特化則2類", go: "第2号10 カドミウム及びその化合物" },
  "7440-38-2": { category: "特化則2類", go: "第2号27の2 砒素及びその化合物" },
  "75-01-4": { category: "特化則2類", go: "第2号6 塩化ビニル" },
  "8007-45-2": { category: "特化則2類", go: "第2号14 コールタール" },
  "7782-50-5": { category: "特化則2類", go: "第2号7 塩素" },
};

/**
 * 特別管理物質（特化則38条の4の号に該当）であるべきCAS。
 * カドミウム（第2号10）は該当号に含まれないため特別管理物質ではない。
 */
const IS_SPECIAL_CONTROL_CAS = new Set<string>([
  "18540-29-9", // クロム酸(11)/重クロム酸(21)
  "7440-38-2", // 砒素(27の2)
  "75-01-4", // 塩化ビニル(6)
  "8007-45-2", // コールタール(14)
]);
const NOT_SPECIAL_CONTROL_CAS = new Set<string>([
  "7440-43-9", // カドミウム(10) — 38条の4の号に非該当
  "1332-21-4", // 石綿 — 特化則外
  "106-99-0", // 1,3-ブタジエン — 令別表第3非収載
]);

const byCas = (cas: string) => chemicalSubstances.find((c) => c.cas === cas);

describe("chemical-substances-db: 特化則区分の正本整合（令別表第3 e-Gov 2026-07-02）", () => {
  it("「特化則1類」は令別表第3第一類物質（7物質）のCASにのみ付与される", () => {
    const offenders = chemicalSubstances
      .filter((c) => c.categories.includes("特化則1類") && !FIRST_CLASS_CAS.has(c.cas))
      .map((c) => `${c.id} ${c.name}(${c.cas})`);
    expect(offenders).toEqual([]);
  });

  it("令別表第3に非収載の物質（石綿/1,3-ブタジエン/MDI）には特化則区分を付与しない", () => {
    for (const cas of NOT_IN_APPENDIX3_CAS) {
      const sub = byCas(cas);
      expect(sub, `CAS ${cas} が見つからない`).toBeTruthy();
      const tokka = sub!.categories.filter((c) => c.startsWith("特化則"));
      expect(tokka, `${sub!.name}(${cas}) に特化則区分が残存`).toEqual([]);
    }
  });

  it.each(Object.entries(EXPECTED_TOKKA_CLASS))(
    "%s は正しい特化則区分を持つ",
    (cas, { category }) => {
      const sub = byCas(cas);
      expect(sub, `CAS ${cas} が見つからない`).toBeTruthy();
      expect(sub!.categories).toContain(category);
      // 誤区分（第一類・第三類）が残っていないこと
      const wrong = (["特化則1類", "特化則2類", "特化則3類"] as const).filter(
        (c) => c !== category && sub!.categories.includes(c),
      );
      expect(wrong, `${sub!.name}(${cas}) に誤った特化則区分`).toEqual([]);
    },
  );

  it("特別管理物質タグは特化則38条の4該当物質にのみ付与（カドミウム等は非該当）", () => {
    for (const cas of IS_SPECIAL_CONTROL_CAS) {
      expect(byCas(cas)?.categories, `${cas} は特別管理物質であるべき`).toContain("特別管理物質");
    }
    for (const cas of NOT_SPECIAL_CONTROL_CAS) {
      expect(byCas(cas)?.categories, `${cas} は特別管理物質ではない`).not.toContain("特別管理物質");
    }
  });

  it("特別管理物質は必ず特化則（1〜3類）区分を伴う（特化則固有の概念のため）", () => {
    const offenders = chemicalSubstances
      .filter(
        (c) =>
          c.categories.includes("特別管理物質") &&
          !c.categories.some((x) => x.startsWith("特化則")),
      )
      .map((c) => `${c.id} ${c.name}(${c.cas})`);
    expect(offenders).toEqual([]);
  });
});
