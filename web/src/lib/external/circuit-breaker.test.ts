import { describe, it, expect, beforeEach } from "vitest";
import {
  withCircuitBreaker,
  CircuitOpenError,
  getSnapshot,
  resetAll,
} from "./circuit-breaker";

describe("circuit-breaker", () => {
  beforeEach(() => {
    resetAll();
  });

  it("stays closed while calls succeed", async () => {
    for (let i = 0; i < 3; i += 1) {
      await withCircuitBreaker("svc", async () => "ok");
    }
    expect(getSnapshot("svc")?.state).toBe("closed");
    expect(getSnapshot("svc")?.totalSuccesses).toBe(3);
  });

  it("opens after consecutive failures and fails fast", async () => {
    const failing = async () => {
      throw new Error("boom");
    };
    for (let i = 0; i < 3; i += 1) {
      await expect(
        withCircuitBreaker("svc", failing, { failureThreshold: 3, cooldownMs: 1_000 })
      ).rejects.toThrow("boom");
    }
    expect(getSnapshot("svc")?.state).toBe("open");

    await expect(
      withCircuitBreaker("svc", failing, { failureThreshold: 3, cooldownMs: 1_000 })
    ).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("transitions OPEN → HALF_OPEN after cooldown and CLOSED on success", async () => {
    const failing = async () => {
      throw new Error("nope");
    };
    for (let i = 0; i < 2; i += 1) {
      await expect(
        withCircuitBreaker("svc", failing, { failureThreshold: 2, cooldownMs: 50 })
      ).rejects.toThrow("nope");
    }
    expect(getSnapshot("svc")?.state).toBe("open");

    await new Promise((r) => setTimeout(r, 75));

    const result = await withCircuitBreaker("svc", async () => "recovered", {
      failureThreshold: 2,
      cooldownMs: 50,
    });
    expect(result).toBe("recovered");
    expect(getSnapshot("svc")?.state).toBe("closed");
  });

  it("re-opens immediately if the half-open trial fails", async () => {
    const failing = async () => {
      throw new Error("still bad");
    };
    for (let i = 0; i < 2; i += 1) {
      await expect(
        withCircuitBreaker("svc", failing, { failureThreshold: 2, cooldownMs: 30 })
      ).rejects.toThrow();
    }
    await new Promise((r) => setTimeout(r, 50));
    await expect(
      withCircuitBreaker("svc", failing, { failureThreshold: 2, cooldownMs: 30 })
    ).rejects.toThrow("still bad");
    expect(getSnapshot("svc")?.state).toBe("open");
  });
});
