import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeatherRiskCard } from "./weather-risk-card";

vi.mock("@/components/official-area-combobox", () => ({
  OfficialAreaCombobox: ({ label }: { label: string }) => (
    <label>
      {label}
      <input aria-label={label} />
    </label>
  ),
}));

describe("WeatherRiskCard initial state", () => {
  it("地域と作業の入力を先に出し、未選択を取得不能や0件と表示しない", () => {
    render(
      <WeatherRiskCard
        data={null}
        status="idle"
        selectedAreaId={null}
        onAreaChange={vi.fn()}
        workType="一般作業"
        onWorkTypeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("現場の地域を検索")).not.toBeNull();
    expect(screen.getByLabelText("今日の主な作業")).not.toBeNull();
    expect(screen.queryByText("表示できるデータがありません。")).toBeNull();
    expect(screen.queryByText(/WBGT/)).toBeNull();
    expect(screen.queryByText(/KYへ引き継ぐ/)).toBeNull();
  });
});
