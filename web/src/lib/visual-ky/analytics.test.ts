import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/track-events", () => ({ trackEvent: mocks.trackEvent }));

import { trackVisualKyEvent } from "./analytics";

describe("visual KY analytics privacy adapter", () => {
  beforeEach(() => {
    mocks.trackEvent.mockClear();
  });

  it("allowlistされた粗い値だけを下位の同意済み基盤へ渡す", () => {
    trackVisualKyEvent("visual_ky_complete", {
      scenarioId: "vkyt-001",
      category: "scaffold",
      difficulty: "標準",
      ctaPosition: "summary",
      completionState: "completed",
      answerCount: 999,
    });
    expect(mocks.trackEvent).toHaveBeenCalledTimes(1);
    const [event, params] = mocks.trackEvent.mock.calls[0];
    expect(event).toBe("visual_ky_complete");
    expect(params).toMatchObject({
      scenario_id: "vkyt-001",
      category: "scaffold",
      difficulty: "標準",
      cta_position: "summary",
      completion_state: "completed",
      answer_count: 9,
    });
    expect(Object.keys(params)).toEqual(
      expect.arrayContaining([
        "scenario_id",
        "category",
        "difficulty",
        "device_class",
        "cta_position",
        "completion_state",
        "answer_count",
        "deployment",
        "date",
      ]),
    );
    expect(JSON.stringify(params)).not.toMatch(
      /https?:|query|token|email|company|answer_text|site_name|user_agent|health/i,
    );
  });
});
