import { describe, expect, it } from "vitest";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  VISUAL_KY_SCENARIOS,
  getVisualKyScenariosByLawArticle,
  getVisualKyScenariosByQualificationId,
  visualKyScenarioSchema,
} from "./index";

describe("visual KY scenario registry", () => {
  it("publishes 15 complete, reviewed, rights-cleared scenarios", () => {
    expect(VISUAL_KY_SCENARIOS).toHaveLength(15);
    expect(PUBLIC_VISUAL_KY_SCENARIOS).toHaveLength(15);

    for (const scenario of PUBLIC_VISUAL_KY_SCENARIOS) {
      expect(() => visualKyScenarioSchema.parse(scenario)).not.toThrow();
      expect(scenario.reviewStatus).toBe("reviewed");
      expect(scenario.indexability).toBe("index");
      expect(scenario.rightsStatus).toBe("generated-for-this-project");
      expect(scenario.image.rightsStatus).toBe(
        "generated-for-this-project",
      );
      expect(scenario.synthetic).toBe(true);
      expect(scenario.syntheticDisclosure).toContain("架空の学習例");
      expect(scenario.kyPrefill.humanReviewRequired).toBe(true);
      expect(scenario.officialSources.length).toBeGreaterThan(0);
      expect(scenario.relatedAccidents.length).toBeGreaterThan(0);
      expect(
        scenario.relatedAccidents.every(
          (accident) => accident.sourceStatus === "curated",
        ),
      ).toBe(true);
      expect(scenario.relatedLaws.length).toBeGreaterThan(0);
      expect(scenario.relatedQualifications.length).toBeGreaterThan(0);
    }
  });

  it("has unique IDs, slugs, images, and valid hotspot relationships", () => {
    expect(new Set(VISUAL_KY_SCENARIOS.map((item) => item.id)).size).toBe(
      VISUAL_KY_SCENARIOS.length,
    );
    expect(new Set(VISUAL_KY_SCENARIOS.map((item) => item.slug)).size).toBe(
      VISUAL_KY_SCENARIOS.length,
    );
    expect(
      new Set(VISUAL_KY_SCENARIOS.map((item) => item.image.src)).size,
    ).toBe(VISUAL_KY_SCENARIOS.length);

    for (const scenario of VISUAL_KY_SCENARIOS) {
      const hotspotIds = new Set(scenario.hotspots.map((spot) => spot.id));
      const hazardIds = new Set(scenario.hazards.map((hazard) => hazard.id));
      const sourceIds = new Set(
        scenario.officialSources.map((source) => source.id),
      );
      const distractor = scenario.hotspots.find(
        (spot) => spot.id === scenario.distractor.hotspotId,
      );
      expect(distractor?.hazardId).toBeNull();

      for (const hazard of scenario.hazards) {
        expect(hotspotIds.has(hazard.hotspotId)).toBe(true);
        expect(hazard.engineeringControls.length).toBeGreaterThan(0);
        expect(hazard.administrativeControls.length).toBeGreaterThan(0);
        expect(hazard.ppe.length).toBeGreaterThan(0);
        expect(hazard.stopEscalationConditions.length).toBeGreaterThan(0);
        expect(
          hazard.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
        ).toBe(true);
      }
      for (const spot of scenario.hotspots) {
        expect(spot.x).toBeGreaterThanOrEqual(4);
        expect(spot.x).toBeLessThanOrEqual(96);
        expect(spot.y).toBeGreaterThanOrEqual(4);
        expect(spot.y).toBeLessThanOrEqual(96);
        if (spot.hazardId !== null) {
          expect(hazardIds.has(spot.hazardId)).toBe(true);
        }
      }
    }
  });

  it("provides complete non-image learning equivalents", () => {
    for (const scenario of VISUAL_KY_SCENARIOS) {
      expect(scenario.image.alt.length).toBeGreaterThan(20);
      expect(scenario.image.fullDescription.length).toBeGreaterThan(80);
      expect(scenario.hazards.length).toBeGreaterThanOrEqual(3);
      expect(scenario.answerExplanation.length).toBeGreaterThan(30);
      expect(
        scenario.countermeasureOptions.some(
          (option) => !option.recommended,
        ),
      ).toBe(true);
      expect(
        scenario.countermeasureOptions.filter(
          (option) => option.recommended,
        ).length,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("does not expose unresolved-rights or draft content", () => {
    expect(
      PUBLIC_VISUAL_KY_SCENARIOS.some(
        (scenario) =>
          scenario.reviewStatus !== "reviewed" ||
          scenario.indexability !== "index" ||
          ![
            "generated-for-this-project",
            "approved-user-owned",
          ].includes(scenario.rightsStatus),
      ),
    ).toBe(false);
  });

  it("provides contextual reverse links from law articles and qualification results", () => {
    expect(
      getVisualKyScenariosByLawArticle(
        "労働安全衛生規則",
        "第107条",
      ).map((scenario) => scenario.slug),
    ).toContain("lone-maintenance");
    expect(
      getVisualKyScenariosByQualificationId(
        "se-36-39-ashiba",
      ).map((scenario) => scenario.slug),
    ).toContain("scaffold-fall");
  });

  it("keeps revised illustration anchors aligned with the visible safety feature", () => {
    const stepladder = VISUAL_KY_SCENARIOS.find(
      (scenario) => scenario.slug === "stepladder-instability",
    );
    expect(
      stepladder?.hotspots.find((spot) => spot.id === "spot-spreader"),
    ).toMatchObject({ x: 63, y: 75 });
    expect(
      stepladder?.hotspots.find((spot) => spot.id === "spot-toolcase"),
    ).toMatchObject({ x: 40, y: 87 });

    const heat = VISUAL_KY_SCENARIOS.find(
      (scenario) => scenario.slug === "heat-stress-summer",
    );
    expect(
      heat?.hotspots.find(
        (spot) => spot.id === "spot-measurement-device",
      ),
    ).toMatchObject({ hazardId: "haz-measurement-device" });
    expect(heat?.distractor.hotspotId).toBe("spot-shade-canopy");
  });
});
