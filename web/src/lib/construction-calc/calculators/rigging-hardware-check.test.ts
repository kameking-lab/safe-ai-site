import { describe, it, expect } from "vitest";
import { riggingHardwareCheckCalculator, HARDWARE_LABELS } from "./rigging-hardware-check";
import { normalizeValues } from "../schema";

/**
 * 玉掛用具（シャックル・アイボルト・フック）使用荷重チェックの数値固定テスト。
 * 判定は「使用荷重（WLL）≥ 作用荷重」の単純比較（WLLに安全係数が織り込み済みのため）。
 * アイボルトの斜め引きは常に使用不可（許容荷重を計算しない設計）を固定する。
 */

const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(riggingHardwareCheckCalculator, raw);
  expect(errors).toEqual([]);
  return riggingHardwareCheckCalculator.compute(values);
};

describe("rigging-hardware-check: 器具種別ラベル", () => {
  it("シャックル・アイボルト・フックの3種", () => {
    expect(Object.keys(HARDWARE_LABELS).sort()).toEqual(["eyebolt", "hook", "shackle"].sort());
  });
});

describe("rigging-hardware-check: シャックル", () => {
  it("WLL1000kg・作用荷重500kgは使用可", () => {
    const out = run({ kind: "shackle", wllKg: 1000, loadKg: 500, angleDeg: 0 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
    expect(out.value).toBe("1,000");
  });
  it("WLL500kg・作用荷重600kgは使用不可", () => {
    const out = run({ kind: "shackle", wllKg: 500, loadKg: 600, angleDeg: 0 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("使用不可");
  });
  it("境界: WLLと作用荷重が等しい場合は使用可", () => {
    const out = run({ kind: "shackle", wllKg: 1000, loadKg: 1000, angleDeg: 0 });
    expect(out.tone).toBe("safe");
  });
});

describe("rigging-hardware-check: フック", () => {
  it("WLL2000kg・作用荷重1500kgは使用可、クレーン則214条を根拠に含む", () => {
    const out = run({ kind: "hook", wllKg: 2000, loadKg: 1500, angleDeg: 0 });
    expect(out.tone).toBe("safe");
    expect(riggingHardwareCheckCalculator.basis.some((b) => b.label.includes("214条"))).toBe(true);
  });
});

describe("rigging-hardware-check: アイボルト（軸方向）", () => {
  it("角度0°（軸方向）はWLL比較のみで判定", () => {
    const out = run({ kind: "eyebolt", wllKg: 1000, loadKg: 800, angleDeg: 0 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
  });
});

describe("rigging-hardware-check: アイボルトの斜め引き", () => {
  it("角度>0°は常に使用不可（WLLに余裕があっても不可）", () => {
    const out = run({ kind: "eyebolt", wllKg: 100000, loadKg: 1, angleDeg: 15 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("斜め引き・使用不可");
  });
  it("斜め引きの警告文にメーカー確認を促す文言を含む", () => {
    const out = run({ kind: "eyebolt", wllKg: 1000, loadKg: 500, angleDeg: 45 });
    expect(out.warnings.join("\n")).toContain("原則禁止");
    expect(out.warnings.join("\n")).toContain("メーカー");
  });
  it("シャックル・フックには角度が影響しない（そもそも角度項目を表示しない判定ロジック）", () => {
    const out = run({ kind: "shackle", wllKg: 1000, loadKg: 500, angleDeg: 45 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
  });
});

describe("rigging-hardware-check: 共通の注意", () => {
  it("不適格品の使用禁止（217条）と証明書確認を促す", () => {
    const out = run({ kind: "shackle", wllKg: 1000, loadKg: 500, angleDeg: 0 });
    expect(out.warnings.join("\n")).toContain("クレーン則第217条");
    expect(out.warnings.join("\n")).toContain("証明書");
  });
});

describe("rigging-hardware-check: 入力正規化", () => {
  it("範囲外の作用荷重は既定値へ戻しエラーを返す", () => {
    const { values, errors } = normalizeValues(riggingHardwareCheckCalculator, { loadKg: -1 });
    expect(values.loadKg).toBe(500);
    expect(errors.length).toBe(1);
  });
  it("選択肢外の器具種別は既定値(shackle)へ戻す", () => {
    const { values, errors } = normalizeValues(riggingHardwareCheckCalculator, { kind: "clamp" });
    expect(values.kind).toBe("shackle");
    expect(errors.length).toBe(1);
  });
});
