import { describe, expect, it } from "vitest";
import type {
  AutomationConsultIdempotencyBeginResult,
  AutomationConsultStateStore,
} from "./state-store";
import type { AutomationConsultSuccess } from "./idempotency";
import { runAutomationConsultStateProbe } from "./production-state-probe";

function sharedStores() {
  const idempotency = new Map<
    string,
    {
      fingerprint: string;
      status: "pending" | "success";
      response?: AutomationConsultSuccess;
    }
  >();
  const rates = new Map<string, number>();
  const store = (): AutomationConsultStateStore => ({
    backend: "postgres",
    async beginIdempotency(
      key,
      fingerprint,
    ): Promise<AutomationConsultIdempotencyBeginResult> {
      const current = idempotency.get(key);
      if (!current) {
        idempotency.set(key, { fingerprint, status: "pending" });
        return { state: "new" };
      }
      if (current.fingerprint !== fingerprint) return { state: "conflict" };
      if (current.status === "pending") return { state: "pending" };
      return current.response
        ? { state: "replay", response: current.response }
        : { state: "conflict" };
    },
    async completeIdempotency(key, fingerprint, response) {
      const current = idempotency.get(key);
      if (
        !current ||
        current.fingerprint !== fingerprint ||
        current.status !== "pending"
      ) {
        return false;
      }
      idempotency.set(key, {
        fingerprint,
        status: "success",
        response,
      });
      return true;
    },
    async releaseIdempotency(key) {
      idempotency.delete(key);
    },
    async consumeRateLimit(clientKey) {
      const count = (rates.get(clientKey) ?? 0) + 1;
      rates.set(clientKey, count);
      return count <= 5
        ? { allowed: true }
        : { allowed: false, retryAfterSeconds: 60 };
    },
  });
  return { first: store(), second: store(), idempotency, rates };
}

describe("automation consultation production state probe", () => {
  it("proves cross-client atomic idempotency, rate limiting, and cleanup", async () => {
    const shared = sharedStores();
    const report = await runAutomationConsultStateProbe({
      first: shared.first,
      second: shared.second,
      anonymousClientKey: "anonymous-probe-client",
      cleanup: async (keys, clientKey) => {
        keys.forEach((key) => shared.idempotency.delete(key));
        shared.rates.delete(clientKey);
      },
    });

    expect(report).toMatchObject({
      ok: true,
      independentClients: 2,
      idempotency: {
        newCount: 1,
        pendingCount: 1,
        replay: true,
        conflict: true,
        duplicateSuccessRows: 0,
      },
      rateLimit: {
        allowedCount: 5,
        deniedCount: 1,
        sharedAcrossClients: true,
      },
      syntheticRowsRemoved: true,
      piiIncluded: false,
    });
    expect(shared.idempotency.size).toBe(0);
    expect(shared.rates.size).toBe(0);
  });
});
