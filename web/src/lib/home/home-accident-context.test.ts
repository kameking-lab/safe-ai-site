import { describe, expect, it } from "vitest";
import {
  buildHomeAccidentKyHref,
  classifyHomeAccidentType,
  classifyHomeAccidentWork,
  isHomeAccidentPublicId,
  parseHomeAccidentType,
  parseHomeAccidentWork,
} from "./home-accident-context";

describe("home accident to KY context", () => {
  it("passes only a public ID and allowlisted enums", () => {
    const headline = "工事現場で作業員が転落し死亡";
    const href = buildHomeAccidentKyHref({
      publicId: "rpt-0123456789abcdef",
      accidentType: classifyHomeAccidentType("墜落・転落（見出し分類）"),
      workCategory: classifyHomeAccidentWork("建設業（見出し分類）"),
    });

    expect(href).toBe("/ky/paper");
    expect(href).not.toContain(encodeURIComponent(headline));
    expect(href).not.toContain(headline);
  });

  it("rejects raw IDs and enum-like unknown values", () => {
    expect(isHomeAccidentPublicId("2026-07-31:raw headline")).toBe(false);
    expect(
      buildHomeAccidentKyHref({
        publicId: "2026-07-31:raw headline",
        accidentType: "fall",
        workCategory: "construction",
      }),
    ).toBeNull();
    expect(parseHomeAccidentType("墜落")).toBeNull();
    expect(parseHomeAccidentWork("建設業")).toBeNull();
  });
});
