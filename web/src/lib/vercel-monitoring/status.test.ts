import { describe, expect, it } from "vitest";
import { classify, statusFor, summarizeAlerts } from "./status";
import { HOBBY_LIMITS } from "./limits";
import type { UsageSample } from "./types";

function sample(percent: number | null): UsageSample {
  return {
    key: "bandwidth",
    spec: HOBBY_LIMITS.bandwidth,
    current: 0,
    limit: HOBBY_LIMITS.bandwidth.hobbyLimit,
    percent,
  };
}

describe("classify", () => {
  it("returns ok below 60%", () => {
    expect(classify(0)).toBe("ok");
    expect(classify(59.9)).toBe("ok");
  });

  it("returns watch between 60% and 80%", () => {
    expect(classify(60)).toBe("watch");
    expect(classify(79.9)).toBe("watch");
  });

  it("returns warn between 80% and 95%", () => {
    expect(classify(80)).toBe("warn");
    expect(classify(94.9)).toBe("warn");
  });

  it("returns critical between 95% and 100%", () => {
    expect(classify(95)).toBe("critical");
    expect(classify(99.9)).toBe("critical");
  });

  it("returns exceeded at or above 100%", () => {
    expect(classify(100)).toBe("exceeded");
    expect(classify(550)).toBe("exceeded");
  });

  it("returns unknown for null percent", () => {
    expect(classify(null)).toBe("unknown");
  });
});

describe("statusFor", () => {
  it("attaches label and color classes matching the level", () => {
    const status = statusFor(sample(120));
    expect(status.level).toBe("exceeded");
    expect(status.label).toBe("停止リスク");
    expect(status.bg).toContain("red");
    expect(status.fg).toContain("red");
  });

  it("returns the unknown style when the percent is null", () => {
    const status = statusFor(sample(null));
    expect(status.level).toBe("unknown");
    expect(status.label).toBe("—");
  });
});

describe("summarizeAlerts", () => {
  it("picks the worst level across samples", () => {
    const samples: UsageSample[] = [sample(10), sample(85), sample(101)];
    const summary = summarizeAlerts(samples);
    expect(summary.worstLevel).toBe("exceeded");
    expect(summary.counts.exceeded).toBe(1);
    expect(summary.counts.warn).toBe(1);
    expect(summary.counts.ok).toBe(1);
  });

  it("ranks unknown above ok but below the alert levels", () => {
    const summary = summarizeAlerts([sample(10), sample(null)]);
    expect(summary.worstLevel).toBe("unknown");
  });
});
