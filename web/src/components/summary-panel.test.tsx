import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryPanel } from "./summary-panel";
import { curatedRevisionSummary } from "@/lib/laws/curated-revision-summary";
import { getLawRevisionById } from "@/data/mock/law-revisions";

describe("収録要点の完成範囲", () => {
  const props = { selectedRevisionId: "test", selectedRevisionTitle: "安衛則", isLoading: false, status: "success" as const, error: null, onRetry: () => {} };
  it("未収録の対応事項・業種に空見出しを出さない", () => {
    render(<SummaryPanel {...props} summaryContent={{ threeLineSummary: ["名称", "公布", "施行"], workplaceActions: [], targetIndustries: [] }} />);
    expect(screen.queryByRole("heading", { name: "現場でやること" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "対象業種" })).toBeNull();
    expect(screen.getByText(/解説は未収録/)).toBeTruthy();
  });
  it("照合した10月改正は前後差分・対象条件・対応と出典を示す", () => {
    const summary = curatedRevisionSummary(getLawRevisionById("lr-egov-347M50002000032-20261001")!)!;
    expect(summary).toBeTruthy();
    render(<SummaryPanel {...props} summaryContent={summary} />);
    expect(screen.getByText(/個人ばく露測定を作業環境測定/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "現場でやること" })).toBeTruthy();
    expect(screen.getByText(/全事業場・全化学物質/)).toBeTruthy();
    expect(screen.getByText(/外部専門家レビューは含みません/)).toBeTruthy();
    expect(screen.getAllByRole("link").length).toBe(5);
    expect(screen.queryByText(/AIが生成/)).toBeNull();
  });
});
