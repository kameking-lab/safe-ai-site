import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceCard } from "./evidence-card";
import type { EvidenceRecord } from "@/lib/evidence/types";

const base: EvidenceRecord = {
  id: "evidence-test",
  informationKind: "circular",
  primarySources: [],
  secondarySources: [],
  legalPosition: null,
  asOf: "2026-07-24",
  promulgatedAt: null,
  effectiveAt: null,
  retrievedAt: "2026-07-24T09:00:00+09:00",
  humanReviewedAt: null,
  dataVersion: "test-v1",
  scope: "テスト表示",
  exclusions: ["個別法令判断"],
  aiGenerated: false,
  humanReviewRequired: true,
  freshness: "unknown",
  verification: "pending",
  supersededBy: null,
  corrections: [],
};

describe("EvidenceCard", () => {
  it("一次資料未確認を確認済みと見せず、色以外の状態語を表示する", () => {
    const { container } = render(<EvidenceCard evidence={base} defaultOpen />);

    expect(
      screen.getByText(/公式一次資料を個別確認できていません/),
    ).not.toBeNull();
    expect(screen.getAllByText(/人手確認待ち/).length).toBeGreaterThan(0);
    expect(screen.getByText("鮮度: 鮮度未確認")).not.toBeNull();
    expect(screen.getByText("AI生成: なし")).not.toBeNull();
    expect(container.querySelector("[data-evidence-verification='pending']")).not.toBeNull();
  });

  it("一次資料、文書番号、人手確認日、訂正履歴を追跡できる", () => {
    render(
      <EvidenceCard
        evidence={{
          ...base,
          primarySources: [
            {
              title: "テスト省令",
              publisher: "テスト省",
              documentNumber: "令和8年省令第1号",
              url: "https://example.test/primary",
            },
          ],
          legalPosition: "省令",
          humanReviewedAt: "2026-07-24",
          verification: "humanVerified",
          freshness: "current",
          humanReviewRequired: false,
          corrections: [
            {
              correctedAt: "2026-07-24",
              summary: "施行日の誤記を訂正",
              previousState: "2026-08-01",
            },
          ],
        }}
        defaultOpen
      />,
    );

    expect(
      screen.getByRole("link", { name: "テスト省令" }).getAttribute("href"),
    ).toBe("https://example.test/primary");
    expect(screen.getByText(/令和8年省令第1号/)).not.toBeNull();
    expect(screen.getAllByText("2026-07-24").length).toBeGreaterThan(0);
    expect(screen.getByText(/施行日の誤記を訂正/)).not.toBeNull();
  });
});
