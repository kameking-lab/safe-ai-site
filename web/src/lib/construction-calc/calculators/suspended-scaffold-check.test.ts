import { describe, it, expect } from "vitest";
import {
  suspendedScaffoldCheckCalculator,
  safetyFactor,
  REQUIRED_SAFETY_FACTOR,
  MIN_WORK_FLOOR_WIDTH_CM,
} from "./suspended-scaffold-check";
import { normalizeValues } from "../schema";

/**
 * 吊り足場チェックの数値固定テスト。
 * 安全係数の期待値は安衛則562条2項の条文値（10/5/2.5/5）そのもの。
 * 作業床の幅40cmの境界も条文（574条1項6号）の「以上」に厳密に従う。
 */
describe("suspended-scaffold-check: safetyFactor（切断荷重÷実荷重の手計算と一致）", () => {
  it("破断荷重100kN・実荷重8kN → 安全係数12.5", () => {
    expect(safetyFactor(100, 8)).toBeCloseTo(12.5, 6);
  });
});

describe("suspended-scaffold-check: 部材別の必要安全係数（562条2項）", () => {
  it("つりワイヤロープ・鋼線=10 / つり鎖・フック=5 / 支点鋼材=2.5 / 支点木材=5", () => {
    expect(REQUIRED_SAFETY_FACTOR.wire).toBe(10);
    expect(REQUIRED_SAFETY_FACTOR.chain_hook).toBe(5);
    expect(REQUIRED_SAFETY_FACTOR.support_steel).toBe(2.5);
    expect(REQUIRED_SAFETY_FACTOR.support_wood).toBe(5);
  });
});

describe("suspended-scaffold-check: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(suspendedScaffoldCheckCalculator, raw);
    expect(errors).toEqual([]);
    return suspendedScaffoldCheckCalculator.compute(values);
  };

  it("ワイヤ・安全係数12.5（10以上）・幅45cm・隙間なし → 適合", () => {
    const out = run({ memberType: "wire", breakingLoadKN: 100, actualLoadKN: 8, workFloorWidthCm: 45, gapStatus: "none" });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
    expect(out.value).toBe("12.5");
  });

  it("境界値: ワイヤの安全係数ちょうど10は適合", () => {
    const out = run({ memberType: "wire", breakingLoadKN: 100, actualLoadKN: 10, workFloorWidthCm: 45, gapStatus: "none" });
    expect(out.tone).toBe("safe");
  });

  it("境界値: ワイヤの安全係数10未満（9.99）は不適合", () => {
    const out = run({ memberType: "wire", breakingLoadKN: 100, actualLoadKN: 10.01, workFloorWidthCm: 45, gapStatus: "none" });
    expect(out.tone).toBe("danger");
  });

  it("つり鎖・フックは5未満で不適合（破断30kN・実荷重8kN→係数3.75）", () => {
    const out = run({ memberType: "chain_hook", breakingLoadKN: 30, actualLoadKN: 8, workFloorWidthCm: 45, gapStatus: "none" });
    expect(out.tone).toBe("danger");
  });

  it("支点鋼材はちょうど2.5で適合・2.5未満で不適合", () => {
    const ok = run({ memberType: "support_steel", breakingLoadKN: 25, actualLoadKN: 10, workFloorWidthCm: 45, gapStatus: "none" });
    expect(ok.tone).toBe("safe");
    const ng = run({ memberType: "support_steel", breakingLoadKN: 25, actualLoadKN: 10.1, workFloorWidthCm: 45, gapStatus: "none" });
    expect(ng.tone).toBe("danger");
  });

  it("境界値: 作業床幅ちょうど40cmは適合・39cmは不適合（574条1項6号）", () => {
    const ok = run({ memberType: "wire", breakingLoadKN: 100, actualLoadKN: 8, workFloorWidthCm: MIN_WORK_FLOOR_WIDTH_CM, gapStatus: "none" });
    expect(ok.tone).toBe("safe");
    const ng = run({ memberType: "wire", breakingLoadKN: 100, actualLoadKN: 8, workFloorWidthCm: 39, gapStatus: "none" });
    expect(ng.tone).toBe("danger");
  });

  it("隙間ありは不適合", () => {
    const out = run({ memberType: "wire", breakingLoadKN: 100, actualLoadKN: 8, workFloorWidthCm: 45, gapStatus: "exists" });
    expect(out.tone).toBe("danger");
  });

  it("574条の使用禁止条件（現地点検）・575条の作業禁止・565条の作業主任者を常に警告する", () => {
    const out = run({});
    const w = out.warnings.join("\n");
    expect(w).toContain("574条");
    expect(w).toContain("575条");
    expect(w).toContain("565条");
  });
});

describe("suspended-scaffold-check: 入力正規化", () => {
  it("数値でない実荷重は既定値へ", () => {
    const { values, errors } = normalizeValues(suspendedScaffoldCheckCalculator, { actualLoadKN: "おもい" });
    expect(values.actualLoadKN).toBe(8);
    expect(errors.length).toBe(1);
  });
});
