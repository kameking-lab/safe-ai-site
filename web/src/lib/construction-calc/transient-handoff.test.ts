import { beforeEach, describe, expect, it } from "vitest";
import {
  clearConstructionCalcHandoffForTest,
  consumeConstructionCalcHandoff,
  putConstructionCalcHandoff,
} from "./transient-handoff";

beforeEach(clearConstructionCalcHandoffForTest);

describe("construction calculator transient handoff", () => {
  it("keeps extracted site values in memory and consumes them once", () => {
    const values = {
      lengthDim: 12.75,
      widthDim: 8.25,
      note: "CONFIDENTIAL-SITE-MARKER",
    };

    putConstructionCalcHandoff({ slug: "concrete-volume", values });
    values.lengthDim = 99;

    expect(consumeConstructionCalcHandoff("another-calculator")).toBeNull();
    expect(consumeConstructionCalcHandoff("concrete-volume")).toEqual({
      slug: "concrete-volume",
      values: {
        lengthDim: 12.75,
        widthDim: 8.25,
        note: "CONFIDENTIAL-SITE-MARKER",
      },
    });
    expect(consumeConstructionCalcHandoff("concrete-volume")).toBeNull();
  });
});
