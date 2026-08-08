import { describe, expect, it } from "vitest";
import { parseLegacyPresetKyHandoff } from "./legacy-preset-handoff";

describe("legacy preset to zero-friction KY handoff", () => {
  it("keeps the ladder preset useful without any free text URL", () => {
    const parsed = parseLegacyPresetKyHandoff("?preset=ladder");
    expect(parsed?.workDraft).toMatch(/脚立/u);
    expect(parsed?.hazardDrafts).toHaveLength(3);
    expect(parsed?.measureDrafts[0]?.hazardId).toBe(
      parsed?.hazardDrafts[0]?.id,
    );
    expect(parsed?.label).toMatch(/候補/u);
  });

  it("maps an allowlisted construction topic without interpreting raw text", () => {
    const parsed = parseLegacyPresetKyHandoff(
      "?industry=construction&topic=scaffold&work=%E7%A7%98%E5%AF%86",
    );
    expect(parsed?.workDraft).toBe("足場の組立て・解体作業");
    expect(parsed?.workCategory).toBe("construction");
    expect(parsed?.workDraft).not.toContain("秘密");
  });

  it("fails closed for unknown preset and topic values", () => {
    expect(parseLegacyPresetKyHandoff("?preset=../../secret")).toBeNull();
    const parsed = parseLegacyPresetKyHandoff(
      "?industry=construction&topic=%E7%A7%98%E5%AF%86",
    );
    expect(parsed?.workDraft).not.toBe("秘密");
  });
});
