import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const SHARED_GUARD_ROUTES = [
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/api/chat/route.ts",
  "src/app/api/chemical-ra/route.ts",
  "src/app/api/chemical/search/route.ts",
  "src/app/api/feedback/route.ts",
  "src/app/api/ky/suggest/route.ts",
  "src/app/api/newsletter/subscribe/route.ts",
  "src/app/api/notify/subscribe/route.ts",
  "src/app/api/sds/search/route.ts",
  "src/app/api/webhooks/stripe/route.ts",
] as const;

describe("high-risk API shared-rate-limit adoption", () => {
  it.each(SHARED_GUARD_ROUTES)("%s uses the shared boundary", (route) => {
    const text = source(route);
    expect(text).toMatch(
      /sharedRateLimitGuard|consumeRequestRateLimit/,
    );
    expect(text).not.toContain("rateBuckets = new Map");
    expect(text).not.toContain("isRateLimited(");
  });

  it("both chatbot transports use the distributed implementation", () => {
    const limiter = source("src/lib/chatbot-rate-limit.ts");
    const standard = source("src/app/api/chatbot/route.ts");
    const stream = source("src/app/api/chatbot/stream/route.ts");
    expect(limiter).toContain("consumeSharedRateLimit");
    expect(limiter).not.toContain("new Map");
    expect(standard).toContain("await checkRateLimit");
    expect(stream).toContain("await checkRateLimit");
  });

  it("push and signage limiter modules contain no process-local production bucket", () => {
    for (const path of [
      "src/lib/notifications/push-subscription-rate-limit.ts",
      "src/lib/ky/signage-rate-limit.ts",
    ]) {
      const text = source(path);
      expect(text).toContain("consumeSharedRateLimit");
      expect(text).not.toContain("new Map");
    }
  });

  it("existing consultation and RUM stores retain shared production backends", () => {
    const consultation = source(
      "src/lib/automation-consult/state-store.ts",
    );
    const rum = source("src/lib/rum/postgres-store.ts");
    expect(consultation).toContain('backend = "postgres"');
    expect(consultation).toContain("isPreviewSafetyMode(env) ? memoryStore : null");
    expect(rum).toContain("database.rumRateBucket.upsert");
  });
});
