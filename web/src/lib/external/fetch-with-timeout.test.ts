import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithTimeout, TimeoutError } from "./fetch-with-timeout";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchWithTimeout", () => {
  it("returns the response when fetch resolves before the timeout", async () => {
    globalThis.fetch = vi.fn(async () => new Response("ok", { status: 200 })) as typeof fetch;
    const res = await fetchWithTimeout("https://example.invalid/x", { timeoutMs: 1000 });
    expect(res.status).toBe(200);
  });

  it("throws TimeoutError when the upstream is too slow", async () => {
    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        })
    ) as typeof fetch;

    await expect(fetchWithTimeout("https://example.invalid/x", { timeoutMs: 30 })).rejects.toBeInstanceOf(
      TimeoutError
    );
  });

  it("propagates non-abort errors unchanged", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;
    await expect(fetchWithTimeout("https://example.invalid/x", { timeoutMs: 100 })).rejects.toThrow(
      "network down"
    );
  });
});
