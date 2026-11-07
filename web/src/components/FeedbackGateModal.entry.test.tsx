import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackGateModal } from "./FeedbackGateModal";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

async function renderEntry() {
  const view = render(<FeedbackGateModal />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
}

function makeEligible() {
  localStorage.setItem("anzen-usage-score-v1", "20");
  localStorage.setItem("anzen-page-view-count-v1", "3");
}

beforeEach(() => {
  navigation.pathname = "/";
  localStorage.clear();
});
afterEach(() => localStorage.clear());

describe("small user-opened feedback entry", () => {
  it("keeps /feedback discoverable but only expands after the user asks", async () => {
    makeEligible();
    const { container } = await renderEntry();
    const toggle = screen.getByRole("button", { name: /ご意見をお聞かせください/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: /改善提案/ })).toBeNull();
    // 固定配置の大きなバナーは描画しない（本文の流れに置く）。
    expect(container.querySelector(".fixed")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: /改善提案/ }).getAttribute("href")).toBe("/feedback");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays hidden for first visits", async () => {
    await renderEntry();
    expect(screen.queryByRole("button", { name: /ご意見/ })).toBeNull();
  });

  it.each([
    "/tools/construction-calculators/concrete-quantity",
    "/construction-calc/concrete-volume",
    "/ky",
  ])("is not shown on the work screen %s", async (pathname) => {
    navigation.pathname = pathname;
    makeEligible();
    await renderEntry();
    expect(screen.queryByRole("button", { name: /ご意見/ })).toBeNull();
  });

  it("snoozes from the expanded entry", async () => {
    makeEligible();
    await renderEntry();
    fireEvent.click(screen.getByRole("button", { name: /ご意見をお聞かせください/ }));
    fireEvent.click(screen.getByRole("button", { name: /あとで/ }));
    expect(screen.queryByRole("button", { name: /ご意見/ })).toBeNull();
    expect(Number(localStorage.getItem("anzen-feedback-gate-snoozed-until-v1"))).toBeGreaterThan(Date.now());
  });
});
