import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  COMING_SOON_CONSTRUCTION_CALCULATORS,
  CONSTRUCTION_CALCULATOR_HUB_PATH,
} from "@/data/construction-calculators/coming-soon";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import { parseAutomationConsultationTypePrefill } from "@/lib/automation-consult/prefill";
import ConstructionCalculatorsPage, { generateMetadata } from "./page";

describe("/tools/construction-calculators", () => {
  it("低リスクの公開12件とリンクなしComing Soon 23件だけを表示する", () => {
    const { container } = render(<ConstructionCalculatorsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "建設計算ツール" })).toBeTruthy();
    expect(constructionCalculatorRegistry).toHaveLength(12);
    expect(COMING_SOON_CONSTRUCTION_CALCULATORS).toHaveLength(23);
    expect(container.querySelectorAll('[data-calculator-status="published"]')).toHaveLength(12);
    expect(container.querySelectorAll('[data-calculator-status="coming-soon"]')).toHaveLength(23);
    for (const item of container.querySelectorAll('[data-calculator-status="coming-soon"]')) {
      expect(item.querySelector("a, button, input, form")).toBeNull();
    }
    expect(constructionCalculatorRegistry.every((item) => item.riskLevel === "low")).toBe(true);
  });

  it("構造・安全判定を公開機能に混ぜず、相談CTAを3件に制限する", () => {
    const { container } = render(<ConstructionCalculatorsPage />);
    expect(container.textContent).toContain("構造設計、強度判定、安全可否判定、法令適合判定は行いません");
    const customize = container.querySelector("#calculator-customize")?.closest("section");
    const links = [...(customize?.querySelectorAll("a") ?? [])];
    expect(links).toHaveLength(3);
    for (const link of links) {
      const url = new URL(link.getAttribute("href") ?? "", "https://www.anzen-ai-portal.jp");
      expect(parseAutomationConsultationTypePrefill(url.search)).not.toBeNull();
      expect([...url.searchParams.keys()]).toEqual(["consultationType"]);
    }
  });

  it("self canonicalを保ち、query付きだけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({ searchParams: Promise.resolve({ unit: "mm" }) });
    expect(canonical.alternates?.canonical).toBe(CONSTRUCTION_CALCULATOR_HUB_PATH);
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.alternates?.canonical).toBe(CONSTRUCTION_CALCULATOR_HUB_PATH);
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
