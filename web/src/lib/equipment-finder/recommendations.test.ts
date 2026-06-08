import { describe, expect, it } from "vitest";
import { harnessCategory } from "@/config/equipment-categories/harness";
import { helmetCategory } from "@/config/equipment-categories/helmet";
import {
  classTier,
  isShapeSelected,
  recommendItems,
} from "./recommendations";
import type { EquipmentItem } from "./filters";

function isHarness(item: { subCategory?: string }): boolean {
  return (item.subCategory ?? "").includes("フルハーネス");
}

function isLanyard(item: { subCategory?: string }): boolean {
  return (item.subCategory ?? "").includes("ランヤード");
}

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
  const lanyard = { subCategory: "ランヤード（巻取式・シングル）" } as EquipmentItem;

  it("形状未指定なら製品クラスに関わらず全件 tier 0（従来挙動）", () => {
    expect(classTier(harness, false)).toBe(0);
    expect(classTier(lanyard, false)).toBe(0);
  });

  it("形状指定時はフルハーネス=0／ランヤード等=1 に降格", () => {
    expect(classTier(harness, true)).toBe(0);
    expect(classTier(lanyard, true)).toBe(1);
  });
});

describe("recommendItems — ハーネス形状指定時のランヤード降格", () => {
  it("X型を指定したのにランヤードが1位になっていた不具合を是正（先頭はフルハーネス）", () => {
    // バグ再現条件: shape=X型 + lanyard=シングル + useCase=construction で
    // シングルランヤードが 30(種別)+30(業種)+10(高評価)=70点 となりX型ハーネスと同点・
    // レビュー数で上回って1位を奪っていた。
    const result = recommendItems(harnessCategory, {
      shape: "X型",
      lanyard: "シングル",
      useCase: "construction",
    });
    expect(result.length).toBeGreaterThan(0);
    expect(isHarness(result[0])).toBe(true);
    expect(isLanyard(result[0])).toBe(false);
  });

  it("形状指定時はすべてのフルハーネスがすべてのランヤードより上位に並ぶ", () => {
    const result = recommendItems(harnessCategory, {
      shape: "X型",
      lanyard: "シングル",
      useCase: "construction",
    });
    const lastHarnessIdx = result.reduce(
      (acc, item, idx) => (isHarness(item) ? idx : acc),
      -1
    );
    const firstLanyardIdx = result.findIndex((item) => isLanyard(item));
    if (lastHarnessIdx !== -1 && firstLanyardIdx !== -1) {
      expect(lastHarnessIdx).toBeLessThan(firstLanyardIdx);
    }
  });

  it("形状を『問わない』にした場合は従来どおり（ランヤードが上位に来てもよい＝スコア純ソート）", () => {
    // 形状を問わずランヤード種別と業種だけ指定すれば、ランヤードが1位でも正常。
    const result = recommendItems(harnessCategory, {
      shape: "any",
      lanyard: "シングル",
      useCase: "construction",
    });
    expect(result.length).toBeGreaterThan(0);
    // tier は全件 0 のため、スコア降順で先頭にランヤードが来得る（降格しない）
    expect(isLanyard(result[0])).toBe(true);
  });

  it("形状指定時もハーネス同士の並びはスコア→レビュー数の従来順を維持", () => {
    const result = recommendItems(harnessCategory, {
      shape: "X型",
      useCase: "construction",
    });
    const harnesses = result.filter(isHarness);
    for (let i = 1; i < harnesses.length; i++) {
      const prev = harnesses[i - 1];
      const cur = harnesses[i];
      if (prev.score === cur.score) {
        expect(prev.reviewCount ?? 0).toBeGreaterThanOrEqual(cur.reviewCount ?? 0);
      } else {
        expect(prev.score).toBeGreaterThan(cur.score);
      }
    }
  });
});
