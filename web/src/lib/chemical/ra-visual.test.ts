import { describe, expect, it } from "vitest";
import {
  computeRaConclusion,
  raLevelMarkerPercent,
  RA_LEVEL_ORDER,
  RA_LEVEL_VISUAL,
  type RaLevel,
} from "./ra-visual";
import type { CreateSimpleAssessment } from "@/app/api/chemical-ra/route";

// 化学物質RA結論ビジュアル（柱0）の回帰ガード。
// 1) I〜IVすべてに完全なクラスセットがあること
// 2) チップがWCAG AA(4.5:1)不適合の組み合わせ（amber/orange-500系+白文字）に退行しないこと
// 3) 結論の決定順位（CREATE-SIMPLE > GHS注意喚起語 > 参考）が崩れないこと

const cs = (level: RaLevel): CreateSimpleAssessment => ({
  level,
  label: `${level}：テスト`,
  exposureRatio: 0.42,
  inputSummary: { ventilation: "換気なし", amount: "大量（>10L/日）", durationHours: 8 },
  rationale: [],
});

describe("RA_LEVEL_VISUAL トークン", () => {
  it("RA_LEVEL_ORDER は I→IV の4区分を重複なく持つ", () => {
    expect(RA_LEVEL_ORDER).toEqual(["I", "II", "III", "IV"]);
    expect(Object.keys(RA_LEVEL_VISUAL).sort()).toEqual([...RA_LEVEL_ORDER].sort());
  });

  it("全区分にクラスセット一式（label/shortAction/chip/soft/text/bar）が揃う", () => {
    for (const level of RA_LEVEL_ORDER) {
      const v = RA_LEVEL_VISUAL[level];
      for (const [key, val] of Object.entries(v)) {
        expect(val, `${level}.${key}`).toBeTruthy();
      }
    }
  });

  it("チップはWCAG AA準拠の組み合わせにピン留め（白文字×中明度背景の再発防止）", () => {
    // heat-illness/risk-visual.test.ts と同型の検証。白文字なら背景は700以上の濃度、
    // そうでなければ淡背景+950系の超濃文字（amber-400×amber-950 ≈ 8.9:1）。
    const allowedWhiteBg = ["bg-emerald-700", "bg-orange-700", "bg-rose-800", "bg-sky-700"];
    for (const level of RA_LEVEL_ORDER) {
      const chip = RA_LEVEL_VISUAL[level].chip;
      if (chip.includes("text-white")) {
        const ok = allowedWhiteBg.some((bg) => chip.includes(bg));
        expect(ok, `${level} chip "${chip}" は白文字に対し濃度不足`).toBe(true);
      } else {
        expect(chip).toMatch(/text-(amber|orange|red|rose|emerald|sky)-9\d\d/);
      }
    }
  });
});

describe("computeRaConclusion 決定順位", () => {
  it("CREATE-SIMPLE 判定があれば常にレベルが主役（GHSの注意喚起語より優先）", () => {
    const c = computeRaConclusion({
      createSimple: cs("IV"),
      ghsHazards: [{ category: "引火性液体", classification: "区分2", signal: "危険" }],
    });
    expect(c.kind).toBe("level");
    expect(c.big).toBe("IV");
    expect(c.title).toBe("直ちに改善");
    expect(c.shortAction).toContain("作業中止");
  });

  it("レベルI=緑（現状維持）/ II=黄 / III=橙 / IV=深紅 のトーン", () => {
    expect(computeRaConclusion({ createSimple: cs("I"), ghsHazards: [] }).visual.soft).toContain("emerald");
    expect(computeRaConclusion({ createSimple: cs("II"), ghsHazards: [] }).visual.soft).toContain("amber");
    expect(computeRaConclusion({ createSimple: cs("III"), ghsHazards: [] }).visual.soft).toContain("orange");
    expect(computeRaConclusion({ createSimple: cs("IV"), ghsHazards: [] }).visual.soft).toContain("rose");
  });

  it("判定なし・GHSに「危険」あり → 赤の注意喚起語が主役", () => {
    const c = computeRaConclusion({
      ghsHazards: [
        { category: "眼刺激性", classification: "区分2", signal: "警告" },
        { category: "引火性液体", classification: "区分2", signal: "危険" },
      ],
    });
    expect(c.kind).toBe("signal");
    expect(c.big).toBe("危険");
    expect(c.visual.soft).toContain("rose");
  });

  it("判定なし・「警告」のみ → 黄", () => {
    const c = computeRaConclusion({
      ghsHazards: [{ category: "眼刺激性", classification: "区分2", signal: "警告" }],
    });
    expect(c.big).toBe("警告");
    expect(c.visual.soft).toContain("amber");
  });

  it("判定もGHSも無し → 青（参考情報・作業条件の入力を促す）", () => {
    const c = computeRaConclusion({ ghsHazards: [] });
    expect(c.kind).toBe("info");
    expect(c.visual.soft).toContain("sky");
    expect(c.shortAction).toContain("作業条件");
  });
});

describe("raLevelMarkerPercent", () => {
  it("各レベルのセグメント中央（12.5/37.5/62.5/87.5%）に乗る", () => {
    expect(raLevelMarkerPercent("I")).toBe(12.5);
    expect(raLevelMarkerPercent("II")).toBe(37.5);
    expect(raLevelMarkerPercent("III")).toBe(62.5);
    expect(raLevelMarkerPercent("IV")).toBe(87.5);
  });
});
