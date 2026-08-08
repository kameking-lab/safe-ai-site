import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChemicalCatalogUnavailableError,
  searchChemicalCatalog,
} from "./search-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchChemicalCatalog fail-closed", () => {
  it("5xxを収載外の空配列へ変換せずunavailableとして拒否する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(searchChemicalCatalog("5xx-test", 8)).rejects.toMatchObject({
      name: "ChemicalCatalogUnavailableError",
      reason: "http",
    });
  });

  it("通信断を収載外とせずunavailableとして拒否する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(searchChemicalCatalog("offline-test", 8)).rejects.toBeInstanceOf(
      ChemicalCatalogUnavailableError,
    );
  });

  it("壊れたJSONを収載外とせずunavailableとして拒否する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{broken", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(searchChemicalCatalog("json-test", 8)).rejects.toMatchObject({
      reason: "invalid-response",
    });
  });

  it("abortはunavailableへ包み直さずAbortErrorのまま返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );

    await expect(
      searchChemicalCatalog("abort-test", 8, new AbortController().signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reuses a completed query across a destination caller with its own signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchChemicalCatalog(
        "destination-cache-test",
        8,
        new AbortController().signal,
      ),
    ).resolves.toEqual([]);
    await expect(
      searchChemicalCatalog(
        "destination-cache-test",
        8,
        new AbortController().signal,
      ),
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shares a pending query across an SPA destination without a duplicate POST", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const homeRequest = searchChemicalCatalog(
      "pending-handoff-test",
      8,
      new AbortController().signal,
    );
    const destinationRequest = searchChemicalCatalog(
      "pending-handoff-test",
      8,
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveResponse?.(
      new Response(JSON.stringify({ ok: true, items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(
      Promise.all([homeRequest, destinationRequest]),
    ).resolves.toEqual([[], []]);
  });
});
