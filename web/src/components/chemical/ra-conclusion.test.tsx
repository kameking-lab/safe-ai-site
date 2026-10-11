import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildOfficialResponse } from "@/lib/chemical/official-ra-response";
import { findByCas } from "@/lib/mhlw-chemicals";
import { ChemicalRaReportHeader } from "./chemical-ra-report-print";
import { GHS_PARTIAL_COVERAGE_NOTICE } from "@/lib/chemical/ghs-coverage";
import { RaConclusionCard } from "./ra-conclusion";
import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import { getChemicalKeyPoints } from "@/lib/chemical/key-points";

// RA結論カード（柱0）の回帰ガード。
// GHS絵表示・注意喚起語・確認動線が確実に描画されること。

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
    />,
  );
}

describe("RaConclusionCard", () => {
  it("実データのトルエンで炎と既存健康有害性を出し、一部収録を冒頭に示す", () => {
    const result = buildOfficialResponse(findByCas("108-88-3")!);
    const { container } = renderCard(result);
    expect(screen.getByTestId("ghs-picto-flame")).toBeTruthy();
    expect(screen.getByTestId("ghs-picto-health-hazard")).toBeTruthy();
    expect(screen.getByTestId("ra-conclusion").textContent).toContain("引火性液体");
    const notice = screen.getByTestId("ghs-coverage-notice");
    expect(notice.textContent).toBe(GHS_PARTIAL_COVERAGE_NOTICE);
    expect(notice.className).not.toContain("print:hidden");
    expect(container.textContent).not.toContain("安全です");
  });

  it("印刷記録も未表示の危険有害性を確認済みと扱わない", () => {
    const { container } = render(<ChemicalRaReportHeader />);
    expect(container.firstElementChild?.className).toContain("print:block");
    expect(container.textContent).toContain(GHS_PARTIAL_COVERAGE_NOTICE);
  });
  it("旧CREATE-SIMPLE判定を表示せずGHS注意喚起語を表示する", () => {
    const { container } = renderCard(withLevel("IV"));
    const big = screen.getByTestId("ra-big-value");
    expect(big.textContent).toBe("危険");
    const segs = container.querySelectorAll("[data-testid^='ra-band-seg-']");
    expect(segs).toHaveLength(0);
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("旧レベルIVから作業中止を断定しない", () => {
    renderCard(withLevel("IV"));
    const card = screen.getByTestId("ra-conclusion");
    expect(card.className).toContain("rose");
    expect(card.textContent).not.toContain("原則 作業中止");
  });

  it("旧レベルIでもGHSの危険表示を優先する", () => {
    renderCard(withLevel("I"));
    const card = screen.getByTestId("ra-conclusion");
    expect(card.className).toContain("rose");
    expect(card.textContent).not.toContain("原則 作業中止");
  });

  it("判定なし: GHSの「危険」をデカ表示し色帯は出ない", () => {
    const { container } = renderCard(baseResult);
    expect(screen.getByTestId("ra-big-value").textContent).toBe("危険");
    expect(container.querySelector("[data-testid='ra-level-band']")).toBeNull();
  });

  it("GHS絵表示と、商品推薦を行わない保護具選定境界を描画", () => {
    renderCard(baseResult);
    expect(screen.getByTestId("ghs-picto-flame")).toBeDefined();
    expect(screen.getByTestId("ghs-picto-health-hazard")).toBeDefined();
    expect(screen.getByTestId("ghs-picto-exclamation")).toBeDefined();
    expect(screen.getByTestId("ra-ppe-boundary").textContent).toContain("商品適合は自動判定していません");
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
