import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackAutomationEvent } from "./analytics";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("@/lib/track-events", () => ({ trackEvent }));

describe("automation consultation analytics allowlist", () => {
  beforeEach(() => trackEvent.mockClear());

  it("allows only the seven operational event names and coarse fields", () => {
    trackAutomationEvent("automation_example_select", {
      page: "/services/automation",
      example_id: "model-01",
      consultation_type: "automation",
      budget_band: "100000-300000",
      success: true,
      cta_position: "model_case",
    });
    expect(trackEvent).toHaveBeenCalledWith("automation_example_select", {
      page: "/services/automation",
      cta_position: "model_case",
      example_id: "model-01",
      consultation_type: "automation",
      budget_band: "100000-300000",
      success: true,
    });
  });

  it("drops arbitrary URL, PII-shaped and unknown classification values", () => {
    trackAutomationEvent("automation_cta_click", {
      page: "sitewide",
      cta_position: "https://example.test/?email=person@example.test",
      example_id: "person@example.test",
      consultation_type: "person@example.test",
      budget_band: "token=secret",
    });
    expect(trackEvent).toHaveBeenCalledWith("automation_cta_click", {
      page: "sitewide",
    });
  });
});
