import { describe, expect, it } from "vitest";
import { verifyBearerSecret } from "./bearer-auth";

describe("verifyBearerSecret", () => {
  it("fails closed when the server secret is missing", () => {
    const result = verifyBearerSecret(new Request("https://example.test/internal"), undefined);
    expect(result).toEqual({ ok: false, status: 503, code: "auth_not_configured" });
  });

  it("rejects a missing or wrong bearer token", () => {
    expect(verifyBearerSecret(new Request("https://example.test/internal"), "expected").ok).toBe(false);
    expect(
      verifyBearerSecret(
        new Request("https://example.test/internal", { headers: { authorization: "Bearer wrong" } }),
        "expected"
      ).ok
    ).toBe(false);
  });

  it("accepts the configured bearer token", () => {
    const request = new Request("https://example.test/internal", {
      headers: { authorization: "Bearer expected" },
    });
    expect(verifyBearerSecret(request, "expected")).toEqual({ ok: true });
  });
});
