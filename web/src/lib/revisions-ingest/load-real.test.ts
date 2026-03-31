import { describe, expect, it, vi } from "vitest";
import { loadRealRevisions, loadRealRevisionsFromPayload } from "@/lib/revisions-ingest/load-real";

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("revisions-ingest load-real", () => {
  it("payload から同期的に正規化済み一覧を返す", () => {
    const result = loadRealRevisionsFromPayload([
      {
        id: "real-1",
        title: "実データテスト",
        published_at: "2026-03-01",
        summary: "概要",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("real-1");
    expect(result[0].publishedAt).toBe("2026-03-01");
  });

  it("endpoint fetch で real データを取得できる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        records: [
          {
            id: "real-2",
            title: "fetchテスト",
            publishedAt: "2026-04-01",
            summary: "概要",
          },
        ],
      })
    );
    const result = await loadRealRevisions({
      endpoint: "https://example.com/revisions.json",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("real-2");
  });

  it("fetch 失敗時は空配列で落ちない", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    const result = await loadRealRevisions({
      endpoint: "https://example.com/revisions.json",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result).toHaveLength(0);
  });
});
