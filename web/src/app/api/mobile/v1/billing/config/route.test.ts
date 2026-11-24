import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/mobile/pro-sales-gate", () => ({
  proSalesStatus: async () => ({ paused: false }),
}));

afterEach(() => vi.unstubAllEnvs());

it.each([
  ["appl_fixture", true],
  ["sk_fixture", false],
  ["other-fixture", false],
] as const)("returns only an App Store SDK credential (%#)", async (candidate, ready) => {
  vi.stubEnv("MOBILE_IAP_ENABLED", "true");
  vi.stubEnv("MOBILE_LEDGER_ENABLED", "true");
  for (const name of [
    "REVENUECAT_IOS_PRODUCT_ID", "REVENUECAT_IOS_OFFERING_ID",
    "REVENUECAT_SECRET_API_KEY", "REVENUECAT_V2_SECRET_API_KEY",
    "REVENUECAT_PROJECT_ID", "REVENUECAT_IOS_V2_PRODUCT_ID",
    "REVENUECAT_WEBHOOK_AUTHORIZATION",
  ]) vi.stubEnv(name, "fixture");
  vi.stubEnv("REVENUECAT_IOS_PUBLIC_SDK_KEY", candidate);

  const response = await GET();
  const body = await response.json();
  expect(body).toMatchObject({ ready, publicKey: ready ? candidate : null });
  if (!ready) expect(JSON.stringify(body)).not.toContain(candidate);
});
