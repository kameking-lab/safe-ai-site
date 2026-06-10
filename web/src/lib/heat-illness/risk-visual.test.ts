import { describe, expect, it } from "vitest";
import type { AcclimatizationState, RiskLevel, WorkIntensity } from "@/types/heat-illness";
import { determineRiskLevel } from "@/lib/wbgt-engine";
import {
  buildRiskScale,
  riskMarkerPercent,
  RISK_ORDER,
  RISK_VISUAL,
  type ScaleSegment,
} from "./risk-visual";

// 熱中症リスクの共通視覚トークン（柱0）の回帰ガード。
// 1) 5区分すべてに完全なクラスセットがあること
// 2) solidチップがWCAG AA(4.5:1)不適合の組み合わせ（amber/orange-500系+白文字）に退行しないこと
// 3) 色帯スケールの境界がリスク判定エンジンと常に一致すること（二重実装の禁止）

const INTENSITIES: WorkIntensity[] = ["light", "moderate", "heavy", "very-heavy"];
const ACCLIMS: AcclimatizationState[] = ["acclimatized", "non-acclimatized"];

describe("RISK_VISUAL トークン", () => {
  it("RISK_ORDER は5区分を安全→危険の順で重複なく持つ", () => {
    expect(RISK_ORDER).toEqual(["safe", "caution", "warning", "severe-warning", "danger"]);
    expect(new Set(RISK_ORDER).size).toBe(5);
    expect(Object.keys(RISK_VISUAL).sort()).toEqual([...RISK_ORDER].sort());
  });

  it("全区分にクラスセット一式（chip/soft/border/text/bar/row/label/shortAction）が揃う", () => {
    for (const level of RISK_ORDER) {
      const v = RISK_VISUAL[level];
      for (const [key, val] of Object.entries(v)) {
        expect(val, `${level}.${key}`).toBeTruthy();
      }
    }
  });

  it("チップはWCAG AA準拠の組み合わせにピン留め（白文字×中明度背景の再発防止）", () => {
    // 白文字を使うなら背景は700以上の濃度。amber/orange/redの400〜600+白文字は
    // コントラスト約2.2〜3.6:1でAA(4.5:1)不足（第2回監査のsafety-tone指摘と同型）。
    const allowedWhiteBg = ["bg-emerald-700", "bg-orange-700", "bg-red-700", "bg-rose-800"];
    for (const level of RISK_ORDER) {
      const chip = RISK_VISUAL[level].chip;
      if (chip.includes("text-white")) {
        const ok = allowedWhiteBg.some((bg) => chip.includes(bg));
        expect(ok, `${level} chip "${chip}" は白文字に対し濃度不足`).toBe(true);
      } else {
        // 白文字を使わない場合は淡背景+超濃文字（amber-400 × amber-950 ≈ 8.9:1）
        expect(chip).toMatch(/text-(amber|orange|red|rose|emerald)-9\d\d/);
      }
    }
  });
});

describe("buildRiskScale 色帯スケール", () => {
  it("中程度・順化済みの境界はJSOH値（22/25/28/31℃）", () => {
    const scale = buildRiskScale("moderate", "acclimatized");
    expect(scale.map((s) => s.fromC)).toEqual([null, 22, 25, 28, 31]);
    expect(scale.map((s) => s.toC)).toEqual([22, 25, 28, 31, null]);
    expect(scale.map((s) => s.level)).toEqual([...RISK_ORDER]);
  });

  it("未順化は全境界が2℃下がる（中程度: 20/23/26/29℃）", () => {
    const scale = buildRiskScale("moderate", "non-acclimatized");
    expect(scale.map((s) => s.fromC)).toEqual([null, 20, 23, 26, 29]);
  });

  it("全組み合わせで境界が昇順かつ隙間なく連続する", () => {
    for (const wi of INTENSITIES) {
      for (const ac of ACCLIMS) {
        const scale = buildRiskScale(wi, ac);
        expect(scale).toHaveLength(5);
        for (let i = 0; i < scale.length - 1; i++) {
          expect(scale[i].toC, `${wi}/${ac} seg${i}`).toBe(scale[i + 1].fromC);
          if (scale[i].fromC !== null) {
            expect(scale[i].fromC!).toBeLessThan(scale[i].toC!);
          }
        }
      }
    }
  });

  it("スケール上の区分はリスク判定エンジンの判定と常に一致する（単一ソース検証）", () => {
    const segmentAt = (scale: ScaleSegment[], wbgt: number): RiskLevel => {
      for (const seg of scale) {
        const lowOk = seg.fromC === null || wbgt >= seg.fromC;
        const highOk = seg.toC === null || wbgt < seg.toC;
        if (lowOk && highOk) return seg.level;
      }
      throw new Error(`segment not found for ${wbgt}`);
    };
    for (const wi of INTENSITIES) {
      for (const ac of ACCLIMS) {
        const scale = buildRiskScale(wi, ac);
        for (let w = 10; w <= 40; w += 0.5) {
          expect(segmentAt(scale, w), `${wi}/${ac}/wbgt=${w}`).toBe(
            determineRiskLevel(w, wi, ac).level,
          );
        }
      }
    }
  });
});

describe("riskMarkerPercent マーカー位置", () => {
  const scale = buildRiskScale("moderate", "acclimatized");

  it("境界値はセグメント境界（20/40/60/80%）に乗る", () => {
    expect(riskMarkerPercent(22, scale)).toBe(20);
    expect(riskMarkerPercent(25, scale)).toBe(40);
    expect(riskMarkerPercent(28, scale)).toBe(60);
    expect(riskMarkerPercent(31, scale)).toBe(80);
  });

  it("両端は0〜100%にクランプされる", () => {
    expect(riskMarkerPercent(-10, scale)).toBe(0);
    expect(riskMarkerPercent(60, scale)).toBe(100);
  });

  it("WBGTに対して単調非減少", () => {
    let prev = -1;
    for (let w = 0; w <= 50; w += 0.25) {
      const p = riskMarkerPercent(w, scale);
      expect(p, `wbgt=${w}`).toBeGreaterThanOrEqual(prev);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
      prev = p;
    }
  });
});
