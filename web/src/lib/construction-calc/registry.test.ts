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
      "/law-navi/347M50002000032/539": ["安衛則", "第539条"],
      "/law-navi/347M50002000034/213": ["クレーン則", "第213条"],
      "/law-navi/347M50002000032/518": ["安衛則", "第518条"],
      "/law-navi/347M50002000032/519": ["安衛則", "第519条"],
      "/law-navi/347M50002000032/562": ["安衛則", "第562条"],
      "/law-navi/347M50002000032/574": ["安衛則", "第574条"],
      "/law-navi/347M50002000032/565": ["安衛則", "第565条"],
      "/law-navi/347M50002000032/526": ["安衛則", "第526条"],
      "/law-navi/347M50002000032/563": ["安衛則", "第563条"],
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

  it("relatedSlugs は registry に実在する slug のみ（幽霊リンク0）", () => {
    for (const c of CONSTRUCTION_CALCULATORS) {
      for (const s of c.relatedSlugs ?? []) {
        expect(getCalculator(s), `${c.slug}.relatedSlugs の "${s}" が registry に存在しない`).toBeDefined();
        expect(s, `${c.slug}.relatedSlugs が自分自身を指している`).not.toBe(c.slug);
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

  it("現場ことば（あだ巻き・目通し・半掛け・2点吊り）→ sling-wire-load", () => {
    for (const text of [
      "あだ巻きで2本4点で吊る",
      "目通し（絞り）で吊れる径は？",
      "半掛けで玉掛けしたい",
      "2点吊りの安全荷重",
    ]) {
      const m = routeByKeywords(text);
      expect(m[0]?.slug, text).toBe("sling-wire-load");
    }
  });

  it("掘削の自然文 → excavation-slope", () => {
    const m = routeByKeywords("深さ3mの溝を掘る。法面の勾配はどこまで立てられる？");
    expect(m[0]?.slug).toBe("excavation-slope");
  });

  it("足場の自然文 → scaffold-tankan-check", () => {
    const m = routeByKeywords("単管足場の建地間隔1.8mで積載300kgは大丈夫？");
    expect(m[0]?.slug).toBe("scaffold-tankan-check");
  });

  it("風荷重の自然文 → wind-load-temporary", () => {
    const m = routeByKeywords("メッシュシートを張った足場の風荷重・風圧を知りたい");
    expect(m[0]?.slug).toBe("wind-load-temporary");
  });

  it("土圧の自然文 → earth-pressure-shoring", () => {
    const m = routeByKeywords("土止め支保工の切ばりにかかる土圧と水圧を概算したい");
    expect(m[0]?.slug).toBe("earth-pressure-shoring");
  });

  it("あと施工アンカーの自然文 → anchor-pullout", () => {
    const m = routeByKeywords("あと施工アンカーの引抜き耐力（コーン破壊・付着）を確認したい");
    expect(m[0]?.slug).toBe("anchor-pullout");
  });

  it("勾配換算の自然文 → slope-ratio-convert", () => {
    const m = routeByKeywords("1:1.5の勾配割を角度と百分率に換算したい");
    expect(m[0]?.slug).toBe("slope-ratio-convert");
  });

  it("吊り角度逆算の自然文 → sling-angle-geometry", () => {
    const m = routeByKeywords("吊り幅とワイヤ長さから吊り角度を逆算したい");
    expect(m[0]?.slug).toBe("sling-angle-geometry");
  });

  it("電圧降下の自然文 → voltage-drop", () => {
    const m = routeByKeywords("こう長50mの電圧降下を内線規程で確認したい");
    expect(m[0]?.slug).toBe("voltage-drop");
  });

  it("梁のたわみの自然文 → beam-deflection", () => {
    const m = routeByKeywords("単管の単純梁のたわみと曲げ応力を計算したい");
    expect(m[0]?.slug).toBe("beam-deflection");
  });

  it("安全ネットの自然文 → safety-net-check", () => {
    const m = routeByKeywords("安全ネット（防網）の落下高さの基準を確認したい");
    expect(m[0]?.slug).toBe("safety-net-check");
  });

  it("足場荷重集計の自然文 → scaffold-load-summary", () => {
    const m = routeByKeywords("足場の建地1本の負担荷重を自重と積載荷重から集計したい");
    expect(m[0]?.slug).toBe("scaffold-load-summary");
  });

  it("防護棚（朝顔）の自然文 → protective-canopy-check", () => {
    const m = routeByKeywords("防護棚（朝顔）の設置基準を知りたい、公衆災害防止要綱の基準は？");
    expect(m[0]?.slug).toBe("protective-canopy-check");
  });

  it("吊り足場の自然文 → suspended-scaffold-check", () => {
    const m = routeByKeywords("つり足場の作業床の幅と隙間、つり鎖の安全係数を確認したい");
    expect(m[0]?.slug).toBe("suspended-scaffold-check");
  });

  it("移動はしご・脚立の自然文 → ladder-stepladder-check", () => {
    const m = routeByKeywords("移動はしごの幅と脚立の開き角度、天板での作業について確認したい");
    expect(m[0]?.slug).toBe("ladder-stepladder-check");
  });

  it("作業床・開口部の自然文 → work-platform-opening-check", () => {
    const m = routeByKeywords("足場の作業床の幅と手すりの高さ、開口部の囲いを確認したい");
    expect(m[0]?.slug).toBe("work-platform-opening-check");
  });

  it("無関係な文はマッチしない", () => {
    const m = routeByKeywords("今日の天気は？");
    expect(m.length).toBe(0);
  });
});

describe("construction-calc ai-router: AI抽出値の検証", () => {
  const sling = getCalculator("sling-wire-load")!;

  it("範囲内の値のみ採用し、欠落は質問として返す（勝手に埋めない）", () => {
    const r = validateExtraction(sling, { loadKg: 2000, mode: "s2" });
    expect(r.values).toEqual({ loadKg: 2000, mode: "s2" });
    // angle / diameter は質問へ（calcMode/construction/dd は aiOptional のため質問しない）
    expect(r.questions.length).toBe(2);
    expect(r.questions.join("\n")).toContain("吊り角度");
  });

  it("上級/任意フィールド（構成種別・D/d比・計算モード）は欠落しても質問しない", () => {
    const r = validateExtraction(sling, { loadKg: 2000, mode: "s2", angle: "60", diameter: "16" });
    expect(r.questions).toEqual([]);
    // 未指定の aiOptional は values にも入らない（正規化で既定値が入る）
    expect(r.values.construction).toBeUndefined();
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

  it("現場ことばの掛け方（目通し・あだ巻き・半掛け・2点吊り）を入力値へ特定する", () => {
    // AI/ラベル一致で掛け方モードの value を確定できる（読み取れない値は質問で返す原則を維持）
    expect(validateExtraction(sling, { loadKg: 3000, mode: "目通し" }).values.mode).toBe("choke");
    expect(validateExtraction(sling, { loadKg: 1500, mode: "あだ巻き" }).values.mode).toBe("wrap");
    expect(validateExtraction(sling, { loadKg: 2000, mode: "半掛け" }).values.mode).toBe("half");
    expect(validateExtraction(sling, { loadKg: 2000, mode: "2本つり" }).values.mode).toBe("s2");
    // 逆引きモードも現場語（適合径・逆引き）から特定できる
    expect(validateExtraction(sling, { calcMode: "逆引き" }).values.calcMode).toBe("reverse");
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
