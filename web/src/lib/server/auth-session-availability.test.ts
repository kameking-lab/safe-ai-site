import { describe, expect, it } from "vitest";
import { clientAuthSessionLookupAllowed } from "./auth-session-availability";

const configured: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  AUTH_SECRET: "configured",
  AUTH_GOOGLE_ID: "configured",
  AUTH_GOOGLE_SECRET: "configured",
};

describe("clientAuthSessionLookupAllowed", () => {
  it("productionで認証3値が揃う場合だけ許可する", () => {
    expect(
      clientAuthSessionLookupAllowed({
        ...configured,
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
  });

  it("Previewと安全stagingでは資格情報があっても拒否する", () => {
    expect(
      clientAuthSessionLookupAllowed({
        ...configured,
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
    expect(
      clientAuthSessionLookupAllowed({
        ...configured,
        SAFE_AI_STAGING_MODE: "true",
      }),
    ).toBe(false);
  });

  it.each(["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] as const)(
    "%sが未構成なら拒否する",
    (key) => {
      expect(
        clientAuthSessionLookupAllowed({
          ...configured,
          [key]: "",
        }),
      ).toBe(false);
    },
  );
});
