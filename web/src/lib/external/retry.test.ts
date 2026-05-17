import { describe, it, expect, vi } from "vitest";
import { retry } from "./retry";

describe("retry", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await retry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors up to maxAttempts", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("flaky upstream 503");
      return "ok";
    });
    const result = await retry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry 4xx errors by default", async () => {
    const fn = vi.fn(async () => {
      throw new Error("HTTP 400 invalid");
    });
    await expect(retry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow("HTTP 400");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("honors a custom shouldRetry predicate", async () => {
    const fn = vi.fn(async () => {
      throw new Error("permanent");
    });
    await expect(
      retry(fn, { maxAttempts: 5, baseDelayMs: 1, shouldRetry: () => false })
    ).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
