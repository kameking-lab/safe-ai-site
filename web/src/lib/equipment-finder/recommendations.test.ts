import { describe, expect, it } from "vitest";
import { harnessCategory } from "@/config/equipment-categories/harness";
import { helmetCategory } from "@/config/equipment-categories/helmet";
import { classTier, isShapeSelected, recommendItems } from "./recommendations";
import type { EquipmentItem } from "./filters";

describe("isShapeSelected", () => {
  it("形状質問のあるハーネスで X型 を選ぶと true", () => {
    expect(isShapeSelected(harnessCategory, { shape: "X型" })).toBe(true);
  });

  it("『問わない』(any) や未選択は false", () => {
    expect(isShapeSelected(harnessCategory, { shape: "any" })).toBe(false);
    expect(isShapeSelected(harnessCategory, {})).toBe(false);
  });

  it("形状質問が無いカテゴリ(ヘルメット)では常に false", () => {
    expect(isShapeSelected(helmetCategory, { shape: "X型" })).toBe(false);
  });
});

describe("classTier", () => {
  const harness = { subCategory: "フルハーネス（X型）" } as EquipmentItem;
  const lanyard = {
    subCategory: "ランヤード（巻取式・シングル）",
  } as EquipmentItem;

  it("形状未指定なら製品クラスに関わらず全件 tier 0（従来挙動）", () => {
    expect(classTier(harness, false)).toBe(0);
    expect(classTier(lanyard, false)).toBe(0);
  });

  it("形状指定時はフルハーネス=0／ランヤード等=1 に降格", () => {
    expect(classTier(harness, true)).toBe(0);
    expect(classTier(lanyard, true)).toBe(1);
  });
});

describe("recommendItems — 未検証の商品カタログ隔離", () => {
  it("条件にかかわらず商品候補を返さない", () => {
    expect(
      recommendItems(harnessCategory, {
        shape: "X型",
        lanyard: "シングル",
        useCase: "construction",
      }),
    ).toEqual([]);
    expect(recommendItems(helmetCategory, {})).toEqual([]);
  });
});
