import { describe, it, expect } from "vitest";
import { CONSTRUCTION_CALCULATORS, getCalculator } from "./registry";
import { routeByKeywords, validateExtraction, calculatorManifest } from "./ai-router";
import { normalizeValues, CALC_DISCLAIMER } from "./schema";
import { findEntryByShort } from "@/lib/law-navi/permalink";

/**
 * レジストリの整合性ゲート（量産時の品質保証。1計算機追加ごとに自動で効く）:
 * - slug 一意・フィールド定義の健全性
 * - 根拠(basis)を必ず1件以上持つ / lawNaviPath は法令ナビ生成集合に実在（幽霊リンク0）
 * - 既定値だけで compute が例外なく完走する（全計算機）
 * - AI入口: キーワードルーティングが自然文で各計算機に到達する
 */
describe("construction-calc registry: 整合性", () => {
  it("slug が一意で getCalculator で引ける", () => {
    const slugs = CONSTRUCTION_CALCULATORS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(getCalculator(s)?.slug).toBe(s);
  });

  it("全計算機がフィールド・根拠・注意・使用例・キーワードを備える", () => {
    for (const c of CONSTRUCTION_CALCULATORS) {
      expect(c.fields.length, c.slug).toBeGreaterThan(0);
      expect(c.basis.length, `${c.slug} は根拠必須`).toBeGreaterThan(0);
      expect(c.cautions.length, c.slug).toBeGreaterThan(0);
      expect(c.examples.length, c.slug).toBeGreaterThan(0);
      expect(c.keywords.length, c.slug).toBeGreaterThan(2);
      // フィールド id 一意
      const ids = c.fields.map((f) => f.id);
      expect(new Set(ids).size, c.slug).toBe(ids.length);
      // number フィールドの範囲と既定値の健全性
      for (const f of c.fields) {
        if (f.kind === "number") {
          expect(f.min, `${c.slug}.${f.id}`).toBeLessThan(f.max);
          expect(f.defaultValue, `${c.slug}.${f.id}`).toBeGreaterThanOrEqual(f.min);
          expect(f.defaultValue, `${c.slug}.${f.id}`).toBeLessThanOrEqual(f.max);
        } else {
          expect(f.options.length, `${c.slug}.${f.id}`).toBeGreaterThan(1);
          expect(
            f.options.some((o) => o.value === f.defaultValue),
            `${c.slug}.${f.id} の既定値は選択肢に含まれること`,
          ).toBe(true);
        }
      }
    }
  });

  it("lawNaviPath は法令ナビ生成集合に実在する（幽霊リンク0）", () => {
    // 静的パスの正当性を curated 集合との突合で保証する。
    // 例: /law-navi/347M50002000032/356 ↔ findEntryByShort("安衛則","第356条").path
    const expected: Record<string, [string, string]> = {
      "/law-navi/347M50002000032/356": ["安衛則", "第356条"],
      "/law-navi/347M50002000032/359": ["安衛則", "第359条"],
      "/law-navi/347M50002000034/213": ["クレーン則", "第213条"],
    };
    for (const c of CONSTRUCTION_CALCULATORS) {
      for (const b of c.basis) {
        if (!b.lawNaviPath) continue;
        const pin = expected[b.lawNaviPath];
        expect(pin, `${c.slug} の lawNaviPath ${b.lawNaviPath} はテストの突合表に追加すること`).toBeDefined();
        const entry = findEntryByShort(pin[0], pin[1]);
        expect(entry?.path, `${c.slug}: ${b.lawNaviPath}`).toBe(b.lawNaviPath);
      }
    }
  });

  it("既定値・使用例の両方で compute が例外なく完走する", () => {
    for (const c of CONSTRUCTION_CALCULATORS) {
      const { values, errors } = normalizeValues(c, {});
      expect(errors, c.slug).toEqual([]);
      const out = c.compute(values);
      expect(out.headline.length, c.slug).toBeGreaterThan(0);
      expect(out.steps.length, c.slug).toBeGreaterThan(0);
      expect(out.warnings.length, c.slug).toBeGreaterThan(0);
      for (const ex of c.examples) {
        const n = normalizeValues(c, ex.values);
        expect(n.errors, `${c.slug} 使用例「${ex.label}」`).toEqual([]);
        expect(() => c.compute(n.values), `${c.slug} 使用例「${ex.label}」`).not.toThrow();
      }
    }
  });

  it("共通免責が有資格者の検討を求める文言を含む", () => {
    expect(CALC_DISCLAIMER).toContain("概算");
    expect(CALC_DISCLAIMER).toContain("有資格者");
  });
});

describe("construction-calc ai-router: キーワードルーティング（決定論フォールバック）", () => {
  it("玉掛けの自然文 → sling-wire-load", () => {
    const m = routeByKeywords("2トンの鉄骨をワイヤ2本で吊りたい。玉掛けの安全荷重は？");
    expect(m[0]?.slug).toBe("sling-wire-load");
  });

  it("掘削の自然文 → excavation-slope", () => {
    const m = routeByKeywords("深さ3mの溝を掘る。法面の勾配はどこまで立てられる？");
    expect(m[0]?.slug).toBe("excavation-slope");
  });

  it("足場の自然文 → scaffold-tankan-check", () => {
    const m = routeByKeywords("単管足場の建地間隔1.8mで積載300kgは大丈夫？");
    expect(m[0]?.slug).toBe("scaffold-tankan-check");
  });

  it("無関係な文はマッチしない", () => {
    const m = routeByKeywords("今日の天気は？");
    expect(m.length).toBe(0);
  });
});

describe("construction-calc ai-router: AI抽出値の検証", () => {
  const sling = getCalculator("sling-wire-load")!;

  it("範囲内の値のみ採用し、欠落は質問として返す（勝手に埋めない）", () => {
    const r = validateExtraction(sling, { loadKg: 2000, strands: "2" });
    expect(r.values).toEqual({ loadKg: 2000, strands: "2" });
    // angle / diameter は質問へ
    expect(r.questions.length).toBe(2);
    expect(r.questions.join("\n")).toContain("吊り角度");
  });

  it("範囲外の数値は棄却して質問へ", () => {
    const r = validateExtraction(sling, { loadKg: 999999 });
    expect(r.values.loadKg).toBeUndefined();
    expect(r.questions.join("\n")).toContain("範囲外");
  });

  it("選択肢外の select 値は棄却して質問へ", () => {
    const r = validateExtraction(sling, { diameter: "11" });
    expect(r.values.diameter).toBeUndefined();
  });

  it("カンマ付き数値文字列を受け付ける", () => {
    const r = validateExtraction(sling, { loadKg: "2,000" });
    expect(r.values.loadKg).toBe(2000);
  });
});

describe("construction-calc ai-router: マニフェスト", () => {
  it("全計算機の slug とフィールドを含む（AI入口プロンプトの材料）", () => {
    const m = calculatorManifest();
    for (const c of CONSTRUCTION_CALCULATORS) {
      expect(m).toContain(`slug: ${c.slug}`);
      for (const f of c.fields) expect(m).toContain(f.id);
    }
  });
});
