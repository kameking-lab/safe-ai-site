import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HubFilter } from "./hub-filter";
import type { AllIndustriesSummary } from "@/lib/accident-analysis";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const industries: AllIndustriesSummary["industries"] = [
  {
    slug: "construction",
    label: "建設業",
    icon: "🏗",
    tagline: "墜落・転落の多い業種",
    colorClass: "amber",
    total: 100,
    fatal: 5,
    topType: "墜落、転落",
    topTypes: ["墜落、転落"],
    peakMonths: [7],
  },
];

afterEach(() => {
  replace.mockReset();
  window.history.replaceState({}, "", "/");
});

describe("HubFilter URL privacy", () => {
  it("入力キーワードは即時絞り込みに使い、固定選択変更後もURLへ送らない", () => {
    window.history.replaceState({}, "", "/accidents-reports");
    render(<HubFilter industries={industries} yearRange={{ min: 2019, max: 2023 }} />);
    const keyword = "山田太郎 新宿A現場";

    fireEvent.change(screen.getByRole("searchbox", { name: "事故内容・原因キーワード" }), {
      target: { value: keyword },
    });
    expect(screen.getByText("条件に合致する業種レポートはありません")).toBeDefined();
    expect(window.location.search).toBe("");
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("combobox", { name: "事故型フィルタ" }), {
      target: { value: "fall" },
    });
    expect(replace).toHaveBeenCalledWith(
      "/accidents-reports?type=fall",
      { scroll: false },
    );
    expect(JSON.stringify(replace.mock.calls)).not.toContain(keyword);
    expect(JSON.stringify(replace.mock.calls)).not.toContain(encodeURIComponent(keyword));
  });
});
