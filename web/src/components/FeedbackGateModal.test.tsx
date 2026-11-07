import { act, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackGateModal } from "./FeedbackGateModal";
import { isWorkContextPath } from "@/lib/usage-tracker";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  localStorage.setItem("anzen-usage-score-v1", "20");
  localStorage.setItem("anzen-page-view-count-v1", "3");
});
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });
describe("feedback prompt does not cover work", () => {
  it("never opens the large banner automatically, even for an eligible visitor", () => {
    render(<FeedbackGateModal />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it.each(["/tools/construction-calculators/concrete-quantity", "/construction-calc/concrete-volume"])("protects calculator inputs and results: %s", pathname => {
    expect(isWorkContextPath(pathname)).toBe(true);
  });
});
