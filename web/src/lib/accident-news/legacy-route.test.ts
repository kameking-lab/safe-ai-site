import { describe, expect, it } from "vitest";
import {
  buildLegacyFatalAccidentsPrintRedirect,
  buildLegacyFatalAccidentsRedirect,
} from "./legacy-route";

describe("buildLegacyFatalAccidentsRedirect", () => {
  it("keeps the plain news route on /accident-news", () => {
    expect(buildLegacyFatalAccidentsRedirect({})).toBeNull();
    expect(buildLegacyFatalAccidentsRedirect({ utm_source: "home" })).toBeNull();
  });

  it("moves former database filters to /fatal-accidents without losing params", () => {
    expect(
      buildLegacyFatalAccidentsRedirect({
        industry: "建設業",
        type: "墜落、転落",
        year: "2023",
        q: "足場",
        page: "2",
        utm_source: "bookmark",
      }),
    ).toBe(
      "/fatal-accidents?industry=%E5%BB%BA%E8%A8%AD%E6%A5%AD&type=%E5%A2%9C%E8%90%BD%E3%80%81%E8%BB%A2%E8%90%BD&year=2023&q=%E8%B6%B3%E5%A0%B4&page=2&utm_source=bookmark",
    );
  });

  it("preserves repeated query values", () => {
    expect(
      buildLegacyFatalAccidentsRedirect({ focus: ["case-a", "case-b"] }),
    ).toBe("/fatal-accidents?focus=case-a&focus=case-b");
  });

  it("moves legacy print filters without losing the query", () => {
    expect(
      buildLegacyFatalAccidentsPrintRedirect({
        industry: "建設業",
        q: "足場",
        limit: "80",
      }),
    ).toBe(
      "/fatal-accidents/print?industry=%E5%BB%BA%E8%A8%AD%E6%A5%AD&q=%E8%B6%B3%E5%A0%B4&limit=80",
    );
  });
});
