import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChemicalsSdsRiskAssessmentPage, { generateMetadata } from "./page";

vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);

describe("/training/safety-seminars/chemicals-sds-risk-assessment", () => {
  it("12枚、5問クイズ、一次資料をSSR表示し、音声UIを置かない", () => {
    const { container } = render(<ChemicalsSdsRiskAssessmentPage />);
    expect(screen.getByRole("heading", { level: 1, name: /化学物質・SDS/u })).toBeTruthy();
    expect(screen.getByText("12枚を戻って復習")).toBeTruthy();
    expect(screen.getByText("5問の確認クイズ")).toBeTruthy();
    expect(container.querySelector("audio")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "音声の種類" })).toBeNull();
    expect(screen.getByRole("link", { name: /労働安全衛生法$/u }).getAttribute("href")).toContain("laws.e-gov.go.jp");
    expect(container.textContent).not.toContain("安全法令ダイジェスト");
  });

  it("self canonicalを保ち、query付きだけnoindexにする", async () => {
    const canonical = await generateMetadata({ searchParams: Promise.resolve({}) });
    const queried = await generateMetadata({ searchParams: Promise.resolve({ slide: "4" }) });
    expect(canonical.alternates?.canonical).toBe("https://www.anzen-ai-portal.jp/training/safety-seminars/chemicals-sds-risk-assessment");
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
