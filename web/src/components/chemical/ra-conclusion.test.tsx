import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RaConclusionCard } from "./ra-conclusion";
import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import { getChemicalKeyPoints } from "@/lib/chemical/key-points";

// RA結論カード（柱0）の回帰ガード。
// 無読テストの前提＝デカ表示・I〜IV色帯・GHS絵表示・保護具動線が確実に描画されること。

const baseResult: ChemicalRaResponse = {
  chemicalName: "トルエン",
  casNumber: "108-88-3",
  ghsHazards: [
    { category: "引火性液体", classification: "区分2", signal: "危険" },
    { category: "特定標的臓器毒性（反復ばく露）", classification: "区分1", signal: "危険" },
    { category: "眼刺激性", classification: "区分2", signal: "警告" },
  ],
  ppeRecommendations: [],
  safetyMeasures: [
    { category: "工学的対策", action: "局所排気装置を設置する", priority: 1 },
    { category: "保護具", action: "有機ガス用防毒マスクを着用する", priority: 3 },
  ],
  emergencyMeasures: [],
  regulatoryNotes: ["有機溶剤中毒予防規則 第2種有機溶剤"],
  rawReply: "",
};

const withLevel = (level: "I" | "II" | "III" | "IV"): ChemicalRaResponse => ({
  ...baseResult,
  createSimple: {
    level,
    label: `${level}：テスト`,
    exposureRatio: 1.25,
    inputSummary: { ventilation: "換気なし", amount: "大量（>10L/日）", durationHours: 8 },
    rationale: ["テスト"],
  },
});

function renderCard(result: ChemicalRaResponse) {
  return render(
    <RaConclusionCard
      result={result}
      keyPoints={getChemicalKeyPoints(result)}
      equipmentHref="/equipment-finder?chemical=%E3%83%88%E3%83%AB%E3%82%A8%E3%83%B3"
    />,
  );
}

describe("RaConclusionCard", () => {
  it("CREATE-SIMPLE判定あり: レベルをデカ表示（text-6xl）＋I〜IVの4セグメント色帯＋▼マーカー", () => {
    const { container } = renderCard(withLevel("IV"));
    const big = screen.getByTestId("ra-big-value");
    expect(big.textContent).toBe("IV");
    expect(big.className).toContain("text-6xl");
    const segs = container.querySelectorAll("[data-testid^='ra-band-seg-']");
    expect(segs).toHaveLength(4);
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("レベルIV: 深紅トーン＋「原則 作業中止」の最前面バナー", () => {
    renderCard(withLevel("IV"));
    const card = screen.getByTestId("ra-conclusion");
    expect(card.className).toContain("rose");
    expect(card.textContent).toContain("原則 作業中止");
  });

  it("レベルI: 緑トーンで作業中止バナーは出ない", () => {
    renderCard(withLevel("I"));
    const card = screen.getByTestId("ra-conclusion");
    expect(card.className).toContain("emerald");
    expect(card.textContent).not.toContain("原則 作業中止");
  });

  it("判定なし: GHSの「危険」をデカ表示し色帯は出ない", () => {
    const { container } = renderCard(baseResult);
    expect(screen.getByTestId("ra-big-value").textContent).toBe("危険");
    expect(container.querySelector("[data-testid='ra-level-band']")).toBeNull();
  });

  it("GHS絵表示の列（引火性=炎・標的臓器=健康有害性・刺激=感嘆符）と保護具動線（44px級）を描画", () => {
    renderCard(baseResult);
    expect(screen.getByTestId("ghs-picto-flame")).toBeDefined();
    expect(screen.getByTestId("ghs-picto-health-hazard")).toBeDefined();
    expect(screen.getByTestId("ghs-picto-exclamation")).toBeDefined();
    const link = screen.getByTestId("ra-equipment-link");
    expect(link.getAttribute("href")).toContain("/equipment-finder");
    expect(link.className).toContain("min-h-[44px]");
  });

  it("まず行う対策は優先度順に表示される", () => {
    renderCard(withLevel("II"));
    const card = screen.getByTestId("ra-conclusion");
    const text = card.textContent ?? "";
    expect(text.indexOf("局所排気装置を設置する")).toBeGreaterThan(-1);
    expect(text.indexOf("局所排気装置を設置する")).toBeLessThan(
      text.indexOf("有機ガス用防毒マスクを着用する"),
    );
  });
});
