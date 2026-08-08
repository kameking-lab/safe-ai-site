import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky";
import { VisualKyFacilitatorMode } from "./facilitator-mode";

vi.mock("@/lib/visual-ky/analytics", () => ({
  trackVisualKyEvent: vi.fn(),
}));

describe("VisualKyFacilitatorMode", () => {
  it("学習目標、問いかけ、時間別台本、任意の回答表示を備える", () => {
    const scenario = PUBLIC_VISUAL_KY_SCENARIOS[0];
    render(
      <VisualKyFacilitatorMode
        scenario={scenario}
        canonicalUrl={`https://www.anzen-ai-portal.jp/training/visual-ky/${scenario.slug}`}
        nextHref="/training/visual-ky/aerial-lift-entrapment/facilitator"
        randomHref="/training/visual-ky/warehouse-trip/facilitator"
      />,
    );
    expect(screen.getByRole("heading", { name: "学習目標" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "最初の問いかけ" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "10分" }));
    expect(
      screen.getByRole("button", { name: "10分" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "答えを表示" }));
    expect(
      screen.getByRole("heading", { name: "危険源と優先対策" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "答えを隠す" }),
    ).toBeTruthy();
  });

  it("問題投影中はヘッダーと講師台本を外し、問題と回答操作だけを表示する", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    const scenario = PUBLIC_VISUAL_KY_SCENARIOS[0];
    render(
      <VisualKyFacilitatorMode
        scenario={scenario}
        canonicalUrl={`https://www.anzen-ai-portal.jp/training/visual-ky/${scenario.slug}`}
        nextHref="/training/visual-ky/aerial-lift-entrapment/facilitator"
        randomHref="/training/visual-ky/warehouse-trip/facilitator"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "問題だけを投影" }));
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalledOnce());
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("heading", { name: "学習目標" })).toBeNull();
    expect(screen.getByRole("button", { name: "答えを表示" })).toBeTruthy();

    Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
  });
});
