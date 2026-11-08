// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ configs: [] as Array<{ id: string; metadata: Record<string, string> }>, created: 0, sessionConfig: undefined as string | undefined }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "member" } })) }));
vi.mock("@/lib/prisma", () => ({ prisma: { subscription: { findUnique: async () => ({ stripeCustomerId: "cus_member" }) } } }));
vi.mock("stripe", () => ({
  default: class {
    billingPortal = {
      configurations: {
        list: async () => ({ data: state.configs }),
        create: async (params: { metadata: Record<string, string>; features: { subscription_update: { enabled: boolean } } }) => {
          expect(params.features.subscription_update.enabled).toBe(false);
          state.created++;
          const config = { id: `bpc_${state.created}`, metadata: params.metadata };
          state.configs.push(config);
          return config;
        },
      },
      sessions: { create: async (params: { configuration?: string }) => { state.sessionConfig = params.configuration; return { url: "https://billing.stripe.com/p/session/x" }; } },
    };
  },
}));
import { POST } from "./route";
beforeEach(() => {
  state.configs = []; state.created = 0; state.sessionConfig = undefined;
  for (const [k, v] of Object.entries({ SAFE_AI_STAGING_MODE: "false", VERCEL_ENV: "development", MOBILE_LEDGER_ENABLED: "true", NEXT_PUBLIC_PAID_MODE: "true", STRIPE_SECRET_KEY: "synthetic-not-real", STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID: "price_synthetic", STRIPE_MANAGE_ONLY_PORTAL_CONFIGURATION_ID: "" })) vi.stubEnv(k, v);
});
afterEach(() => vi.unstubAllEnvs());
it("creates one manage-only portal configuration when none is configured, then reuses it", async () => {
  expect((await POST()).status).toBe(200);
  expect(state.sessionConfig).toBe("bpc_1");
  expect((await POST()).status).toBe(200);
  expect(state.created).toBe(1);
  expect(state.sessionConfig).toBe("bpc_1");
});
it("uses an explicitly configured portal configuration", async () => {
  vi.stubEnv("STRIPE_MANAGE_ONLY_PORTAL_CONFIGURATION_ID", "bpc_owner");
  expect((await POST()).status).toBe(200);
  expect(state.sessionConfig).toBe("bpc_owner");
  expect(state.created).toBe(0);
});
