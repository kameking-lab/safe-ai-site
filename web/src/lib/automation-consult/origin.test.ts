import { describe, expect, it } from "vitest";
import { hasJsonContentType, isValidAutomationConsultOrigin } from "./origin";

describe("automation consult origin boundary", () => {
  it("accepts same-origin JSON requests", () => {
    const request = new Request("https://example.test/api/automation-consult", {
      method: "POST",
      headers: {
        origin: "https://example.test",
        "content-type": "application/json; charset=utf-8",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isValidAutomationConsultOrigin(request)).toBe(true);
    expect(hasJsonContentType(request)).toBe(true);
  });

  it("fails closed for missing, cross-origin, or cross-site origins", () => {
    expect(
      isValidAutomationConsultOrigin(
        new Request("https://example.test/api/automation-consult")
      )
    ).toBe(false);
    expect(
      isValidAutomationConsultOrigin(
        new Request("https://example.test/api/automation-consult", {
          headers: { origin: "https://attacker.test" },
        })
      )
    ).toBe(false);
    expect(
      isValidAutomationConsultOrigin(
        new Request("https://example.test/api/automation-consult", {
          headers: {
            origin: "https://example.test",
            "sec-fetch-site": "cross-site",
          },
        })
      )
    ).toBe(false);
  });
});
