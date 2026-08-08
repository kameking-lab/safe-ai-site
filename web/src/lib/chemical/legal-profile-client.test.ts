import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearChemicalLegalProfileRequestCache,
  fetchChemicalLegalProfile,
} from "./legal-profile-client";

describe("fetchChemicalLegalProfile", () => {
  beforeEach(() => {
    clearChemicalLegalProfileRequestCache();
  });

  afterEach(() => {
    clearChemicalLegalProfileRequestCache();
    vi.restoreAllMocks();
  });

  it("同一物質の並行取得を1回のPOSTへまとめ、検索語をURLへ出さない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ resolved: true, key: "toluene" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      fetchChemicalLegalProfile<{ key: string }>("108-88-3"),
      fetchChemicalLegalProfile<{ key: string }>("108-88-3"),
    ]);

    expect(first.key).toBe("toluene");
    expect(second.key).toBe("toluene");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chemical/legal-profile",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ q: "108-88-3" }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("108-88-3");
  });

  it("失敗した取得はキャッシュせず再試行できる", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ resolved: false }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchChemicalLegalProfile("108-88-3")).rejects.toThrow(
      "法令プロファイルを取得できませんでした。",
    );
    await expect(fetchChemicalLegalProfile("108-88-3")).resolves.toEqual({
      resolved: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
