import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutomationAnalyticsMarker,
  AutomationConsultCta,
  AutomationExampleDetails,
} from "./automation-consult-cta";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("@/lib/track-events", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

describe("AutomationConsultCta", () => {
  beforeEach(() => {
    trackEvent.mockClear();
  });

  it("44px以上のCTAで、固定の大分類だけを計測する", () => {
    render(
      <AutomationConsultCta
        position="hero"
        consultationType="automation"
        budgetBand="100000-300000"
      >
        業務自動化について無料相談する
      </AutomationConsultCta>,
    );

    const link = screen.getByRole("link", { name: "業務自動化について無料相談する" });
    expect(link.className).toContain("min-h-[44px]");
    expect(link.getAttribute("href")).toBe("/services/automation#consult-form");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("automation_cta_click", {
      page: "/services/automation",
      cta_position: "hero",
      consultation_type: "automation",
      budget_band: "100000-300000",
      success: true,
    });
  });

  it("サイト内導線は任意URLを読まず、positionに対応する固定pageだけを送る", () => {
    render(
      <AutomationConsultCta position="home" href="/services/automation?ignored=secret">
        現場業務の効率化を相談する
      </AutomationConsultCta>,
    );
    const link = screen.getByRole("link", { name: "現場業務の効率化を相談する" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("automation_cta_click", {
      page: "/",
      cta_position: "home",
      success: true,
    });
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain("ignored");
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain("secret");
  });

  it.each([
    ["home_primary", "無料相談"],
    ["home_pricing", "料金目安"],
    ["home_examples", "自動化例"],
    ["home_training", "講習・資料"],
    ["home_hero", "ヒーロー相談"],
  ] as const)("ホームCTA位置を固定値で区別する: %s", (position, label) => {
    render(
      <AutomationConsultCta position={position}>{label}</AutomationConsultCta>,
    );
    const link = screen.getByRole("link", { name: label });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("automation_cta_click", {
      page: "/",
      cta_position: position,
      success: true,
    });
  });

  it("他ページのCTAは個別ルートを送らずsitewideへ正規化する", () => {
    render(
      <AutomationConsultCta position="chemical_ra">
        化学物質RAから相談
      </AutomationConsultCta>,
    );
    const link = screen.getByRole("link", { name: "化学物質RAから相談" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("automation_cta_click", {
      page: "sitewide",
      cta_position: "chemical_ra",
      success: true,
    });
  });

  it("セクションが表示領域へ入った時だけ閲覧を一度計測する", () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class FakeIntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: number[] = [];
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

    render(<AutomationAnalyticsMarker event="automation_pricing_view" />);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(trackEvent).not.toHaveBeenCalled();

    callback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(trackEvent).toHaveBeenCalledWith("automation_pricing_view", {
      page: "/services/automation",
      success: true,
    });
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("モデルケースを初めて開いた時だけ固定IDを計測する", () => {
    render(
      <AutomationExampleDetails
        id="model-case-1"
        exampleId="model-01"
      >
        <summary>Excel整形</summary>
        <p>詳細</p>
      </AutomationExampleDetails>,
    );
    const details = screen.getByText("Excel整形").closest("details");
    expect(details).not.toBeNull();
    (details as HTMLDetailsElement).open = true;
    fireEvent(details as HTMLDetailsElement, new Event("toggle"));
    expect(trackEvent).toHaveBeenCalledWith("automation_example_select", {
      page: "/services/automation",
      example_id: "model-01",
      success: true,
    });
    (details as HTMLDetailsElement).open = false;
    fireEvent(details as HTMLDetailsElement, new Event("toggle"));
    (details as HTMLDetailsElement).open = true;
    fireEvent(details as HTMLDetailsElement, new Event("toggle"));
    expect(
      trackEvent.mock.calls.filter(
        ([event]) => event === "automation_example_select",
      ),
    ).toHaveLength(1);
  });
});
