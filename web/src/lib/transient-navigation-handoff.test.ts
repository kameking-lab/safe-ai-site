import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTransientNavigationHandoffsForTest,
  consumeHealthCheckupHandoff,
  consumeSafetyPlanHandoff,
  putHealthCheckupHandoff,
  putSafetyPlanHandoff,
} from "./transient-navigation-handoff";

beforeEach(clearTransientNavigationHandoffsForTest);

describe("transient navigation handoff", () => {
  it("consumes a safety plan once and never serialises it", () => {
    putSafetyPlanHandoff({
      templateId: "construction-medium",
      fiscalYear: 2026,
      organizationName: "Example Works",
      focusAreas: ["ky"],
      specialWork: ["high-place"],
      hasOverseasAssignment: false,
      overworkPriority: "normal",
      notes: "private note",
    });
    expect(consumeSafetyPlanHandoff("other-template")).toBeNull();
    expect(consumeSafetyPlanHandoff("construction-medium")).toMatchObject({
      organizationName: "Example Works",
      notes: "private note",
    });
    expect(consumeSafetyPlanHandoff("construction-medium")).toBeNull();
  });

  it("consumes a health-checkup profile once", () => {
    putHealthCheckupHandoff({
      industry: "construction",
      jobIds: ["construction-general"],
      substances: ["asbestos"],
      workConditions: ["night-work"],
      hireDate: "2026-08-02",
    });
    expect(consumeHealthCheckupHandoff()).toMatchObject({
      hireDate: "2026-08-02",
      substances: ["asbestos"],
    });
    expect(consumeHealthCheckupHandoff()).toBeNull();
  });
});
