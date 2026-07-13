import { describe, it, expect } from "vitest";
import {
  hoistRatedCheckCalculator,
  WIRE_REQUIRED_SAFETY_FACTOR,
  HOOK_REQUIRED_SAFETY_FACTOR,
} from "./hoist-rated-check";
import { normalizeValues, STANDARD_GRAVITY } from "../schema";

/**
 * つり上げ装置（巻上ワイヤ・フック）安全係数チェックの数値固定テスト。
 * 期待値は 安全係数 = 切断/破断荷重(kN) ÷ 実荷重(kN) から独立に手計算した値で固定する。
 *
 * 安全係数の基準値そのものを固定するテスト（重要）:
 * クレーン則第213条＝ワイヤロープ6以上・第214条＝フック又はシャックル5以上。
 * 元の部隊プロンプトには「フックの安全係数4」という誤記載があったが、本リポジトリの
 * 法令コーパス（web/src/data/laws/crane-kisoku.ts 第214条原文）で確認した正しい値（5）を
 * 採用しているため、この定数が4に後退しないことをテストで固定する。
 */

describe("hoist-rated-check: 安全係数の基準値（クレーン則の原文で確認済み）", () => {
  it("ワイヤロープは6以上（クレーン則213条）", () => {
    expect(WIRE_REQUIRED_SAFETY_FACTOR).toBe(6);
  });
  it("フックは5以上（クレーン則214条＝フック又はシャックル。4ではない）", () => {
    expect(HOOK_REQUIRED_SAFETY_FACTOR).toBe(5);
  });
});

const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(hoistRatedCheckCalculator, raw);
  expect(errors).toEqual([]);
  return hoistRatedCheckCalculator.compute(values);
};

const loadKn = (kg: number) => (kg * STANDARD_GRAVITY) / 1000;

describe("hoist-rated-check: 両方とも基準を満たす", () => {
  it("実荷重3t・ワイヤ220kN・フック160kNは使用可", () => {
    const out = run({ loadKg: 3000, wireBreakingKn: 220, hookBreakingKn: 160 });
    const wireSf = 220 / loadKn(3000);
    const hookSf = 160 / loadKn(3000);
    expect(wireSf).toBeGreaterThan(WIRE_REQUIRED_SAFETY_FACTOR);
    expect(hookSf).toBeGreaterThan(HOOK_REQUIRED_SAFETY_FACTOR);
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
    expect(out.items.find((i) => i.label.includes("ワイヤの安全係数"))?.tone).toBe("safe");
    expect(out.items.find((i) => i.label.includes("フックの安全係数"))?.tone).toBe("safe");
  });
});

describe("hoist-rated-check: ワイヤ側が不足", () => {
  it("実荷重5t・ワイヤ200kN（係数約4.08<6）・フック300kN（約6.12≥5）は使用不可", () => {
    const out = run({ loadKg: 5000, wireBreakingKn: 200, hookBreakingKn: 300 });
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("ワイヤの安全係数"))?.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("フックの安全係数"))?.tone).toBe("safe");
    expect(out.warnings.join("\n")).toContain("巻上ワイヤの安全係数が6未満");
  });
});

describe("hoist-rated-check: フック側が不足", () => {
  it("実荷重5t・ワイヤ350kN（約7.14≥6）・フック200kN（約4.08<5）は使用不可", () => {
    const out = run({ loadKg: 5000, wireBreakingKn: 350, hookBreakingKn: 200 });
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("ワイヤの安全係数"))?.tone).toBe("safe");
    expect(out.items.find((i) => i.label.includes("フックの安全係数"))?.tone).toBe("danger");
    expect(out.warnings.join("\n")).toContain("フックの安全係数が5未満");
  });
});

describe("hoist-rated-check: 両方不足", () => {
  it("小さすぎる切断・破断荷重は両方とも不足で使用不可", () => {
    const out = run({ loadKg: 5000, wireBreakingKn: 10, hookBreakingKn: 10 });
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("ワイヤの安全係数"))?.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("フックの安全係数"))?.tone).toBe("danger");
  });
});

describe("hoist-rated-check: 未入力", () => {
  it("ワイヤ切断荷重0は入力を促す", () => {
    const out = run({ loadKg: 3000, wireBreakingKn: 0, hookBreakingKn: 160 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("切断荷重を入力してください");
  });
  it("フック破断荷重0は入力を促す", () => {
    const out = run({ loadKg: 3000, wireBreakingKn: 220, hookBreakingKn: 0 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("切断荷重を入力してください");
  });
});

describe("hoist-rated-check: 根拠・相互リンク", () => {
  it("213条・214条ともlawNaviPathを持つ", () => {
    const paths = hoistRatedCheckCalculator.basis.map((b) => b.lawNaviPath).filter(Boolean);
    expect(paths).toContain("/law-navi/347M50002000034/213");
    expect(paths).toContain("/law-navi/347M50002000034/214");
  });
  it("クレーン本体側の定格総荷重（crane-rated-load）へ案内する注意を含む", () => {
    expect(hoistRatedCheckCalculator.cautions.join("\n")).toContain("クレーン必要定格総荷重の逆引き");
  });
});

describe("hoist-rated-check: 入力正規化", () => {
  it("範囲外の実荷重は既定値へ戻しエラーを返す", () => {
    const { values, errors } = normalizeValues(hoistRatedCheckCalculator, { loadKg: -1 });
    expect(values.loadKg).toBe(3000);
    expect(errors.length).toBe(1);
  });
});
