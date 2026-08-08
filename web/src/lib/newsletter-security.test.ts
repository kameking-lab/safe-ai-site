import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildUnsubscribeUrl,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./newsletter";

afterEach(() => vi.unstubAllEnvs());

describe("newsletter unsubscribe token fail-closed boundary", () => {
  it.each(["production", "test"] as const)(
    "does not generate or expose a reusable token in %s",
    (nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("AUTH_SECRET", "legacy-secret-must-not-reactivate-tokens");

      expect(() =>
        generateUnsubscribeToken("Person@Example.invalid"),
      ).toThrow(/opaque, expiring/i);
      expect(buildUnsubscribeUrl("Person@Example.invalid")).toBeNull();
    },
  );

  it("rejects every supplied token while the opaque-token flow is unavailable", () => {
    vi.stubEnv("AUTH_SECRET", "legacy-secret-must-not-reactivate-tokens");

    for (const token of ["", "forged", "legacy-deterministic-token"]) {
      expect(
        verifyUnsubscribeToken("person@example.invalid", token),
      ).toBe(false);
    }
  });
});
