import { describe, expect, it } from "vitest";
import { EQUIPMENT_CATEGORIES } from "@/config/equipment-categories";
import { getAllChemicalProfiles } from "@/lib/chemical-equipment-mapping";
import {
  PPE_CATEGORY_ICON,
  PPE_ICON_LABEL,
  resolvePpeItemIcon,
} from "./ppe-pictogram-map";

// 保護具ピクトグラム対応表（柱0）の回帰ガード。
// カテゴリ網羅・全絵IDのラベル・自由文解決の代表ケースを固定する。

describe("PPE_CATEGORY_ICON", () => {
  it("equipment-categories の全12カテゴリIDを網羅する（カテゴリ追加時の取りこぼし防止）", () => {
    for (const c of EQUIPMENT_CATEGORIES) {
      expect(PPE_CATEGORY_ICON[c.id], `カテゴリ ${c.id} の絵が未定義`).toBeTruthy();
    }
  });

  it("化学物質→保護具マッピングの推奨カテゴリも全件解決できる", () => {
    for (const p of getAllChemicalProfiles()) {
      for (const catId of p.recommendedCategories) {
        expect(PPE_CATEGORY_ICON[catId], `${p.name} の推奨 ${catId}`).toBeTruthy();
      }
    }
  });

  it("全絵IDに着用義務ラベルがある", () => {
    for (const icon of Object.values(PPE_CATEGORY_ICON)) {
      expect(PPE_ICON_LABEL[icon], icon).toBeTruthy();
    }
  });
});

describe("resolvePpeItemIcon（RA結果の保護具名・自由文）", () => {
  it("呼吸用保護具の分岐（防毒・防じん）", () => {
    expect(resolvePpeItemIcon("防毒マスク（有機ガス用吸収缶）")).toBe("gas-mask");
    expect(resolvePpeItemIcon("送気マスク")).toBe("gas-mask");
    expect(resolvePpeItemIcon("防じんマスク（DS2以上）")).toBe("dust-mask");
    expect(resolvePpeItemIcon("電動ファン付き呼吸用保護具")).toBe("dust-mask");
    expect(resolvePpeItemIcon("呼吸用保護具")).toBe("gas-mask");
  });

  it("手・眼・身体・足の代表ケース", () => {
    expect(resolvePpeItemIcon("耐溶剤性手袋（ニトリル製）")).toBe("gloves");
    expect(resolvePpeItemIcon("保護メガネ（密閉ゴーグル型）")).toBe("goggles");
    expect(resolvePpeItemIcon("フェイスシールド")).toBe("goggles");
    expect(resolvePpeItemIcon("化学防護服（タイプ5/6）")).toBe("clothing");
    expect(resolvePpeItemIcon("耐薬品性長靴")).toBe("boots");
    expect(resolvePpeItemIcon("保護帽（飛来落下用）")).toBe("helmet");
  });

  it("該当なしは undefined（表示側で汎用の盾にフォールバック）", () => {
    expect(resolvePpeItemIcon("作業手順書")).toBeUndefined();
    expect(resolvePpeItemIcon("")).toBeUndefined();
  });
});
