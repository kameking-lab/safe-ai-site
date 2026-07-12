import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalcReportSheet } from "@/components/construction-calc/calc-report-sheet";
import { CONSTRUCTION_CALCULATORS } from "@/lib/construction-calc/registry";
import { normalizeValues, CALC_DISCLAIMER } from "@/lib/construction-calc/schema";
import { SITE_NAME, SITE_URL } from "@/lib/seo-metadata";

/**
 * 計算書PDF基盤（提出用A4帳票）の共通ゲート。
 * registry 定義から自動生成される帳票が、社長要求の必須7項目を全計算機で満たすことを機械保証する:
 *   表題・作成日時・入力条件・計算式代入・判定・根拠/出典・注意/免責・作成者/確認者欄・サイト名URL。
 * 計算機を1本足すたびにこのゲートが自動で効く（手作り帳票の禁止＝基盤の唯一性を守る）。
 */
describe("CalcReportSheet: 提出用計算書の必須項目（全計算機共通）", () => {
  const PRINTED_AT = "2026年07月12日 09:30";

  for (const calc of CONSTRUCTION_CALCULATORS) {
    it(`${calc.slug}: 表題・作成日時・根拠・免責・作成/確認欄・サイト名を含む`, () => {
      const { values } = normalizeValues(calc, {});
      const outcome = calc.compute(values);
      const { container } = render(
        <CalcReportSheet calc={calc} values={values} outcome={outcome} printedAt={PRINTED_AT} />,
      );
      const html = container.textContent ?? "";

      // 表題（計算機タイトル）と作成日時
      expect(html).toContain(calc.title);
      expect(html).toContain("計算書");
      expect(html).toContain(PRINTED_AT);
      expect(html).toContain("作成日時");

      // セクション見出し（必須項目）
      expect(html).toContain("入力条件");
      expect(html).toContain("判定結果");
      expect(html).toContain("計算式と代入過程");
      expect(html).toContain("根拠（法令・基準・出典）");
      expect(html).toContain("注意事項");
      expect(html).toContain("免責");

      // 根拠の条文名が本文に出る（出典の明記）
      for (const b of calc.basis) expect(html).toContain(b.label);

      // 免責文・作成者/確認者欄・サイト名/URL
      expect(html).toContain(CALC_DISCLAIMER);
      expect(html).toContain("作成者");
      expect(html).toContain("確認者");
      expect(html).toContain(SITE_NAME);
      expect(html).toContain(SITE_URL);

      // 計算過程の各ステップが載る（式と代入の可視化）
      for (const s of outcome.steps) expect(html).toContain(s);
    });
  }

  it("入力条件は select の value ではなく label で表示する（提出書の可読性）", () => {
    const sling = CONSTRUCTION_CALCULATORS.find((c) => c.slug === "sling-wire-load")!;
    const { values } = normalizeValues(sling, {});
    const outcome = sling.compute(values);
    render(<CalcReportSheet calc={sling} values={values} outcome={outcome} printedAt="2026年07月12日 09:30" />);
    // select フィールドの既定値ラベルが本文に出る（value 文字列そのままではない）
    for (const f of sling.fields) {
      if (f.kind === "select") {
        const opt = f.options.find((o) => o.value === String(values[f.id]));
        if (opt) expect(screen.getAllByText(new RegExp(opt.label.slice(0, 2))).length).toBeGreaterThan(0);
      }
    }
  });
});
