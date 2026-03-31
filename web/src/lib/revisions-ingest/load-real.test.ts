import { describe, expect, it, vi } from "vitest";
import {
  loadRealRevisions,
  loadRealRevisionsFromPayload,
  loadRealRevisionsWithMeta,
  validateRealSourceEndpoint,
} from "@/lib/revisions-ingest/load-real";

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

  it("sourceFormat=official-db で取得元差分を吸収できる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        records: [
          {
            lawId: "real-3",
            lawTitle: "公式DB法改正",
            promulgatedAt: "2026-05-01",
            effectiveDate: "2026-09-01",
            amendmentType: "省令改正",
            lawNumber: "令和8年 省令 第20号",
            issuedBy: "厚生労働省",
            summary: "公式DB形式の概要",
            sourceUrl: "https://elaws.e-gov.go.jp/",
            sourceLabel: "e-Gov法令検索",
            sourceIssuer: "デジタル庁",
          },
        ],
      })
    );
    const result = await loadRealRevisions({
      endpoint: "https://example.com/official.json",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sourceFormat: "official-db",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("real-3");
    expect(result[0].title).toBe("公式DB法改正");
    expect(result[0].publishedAt).toBe("2026-09-01");
    expect(result[0].revisionNumber).toBe("令和8年 省令 第20号");
    expect(result[0].issuer).toBe("厚生労働省");
    expect(result[0].kind).toBe("ordinance");
    expect(result[0].source?.label).toBe("e-Gov法令検索");
  });

  it("fetch 失敗時は空配列で落ちない", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    const result = await loadRealRevisions({
      endpoint: "https://example.com/revisions.json",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result).toHaveLength(0);
  });

  it("payload が不正な場合でも空配列で落ちない", () => {
    const result = loadRealRevisionsFromPayload({ foo: "bar" });
    expect(result).toHaveLength(0);
  });

  it("validateRealSourceEndpoint: https + allowed host のみ許可する", () => {
    const valid = validateRealSourceEndpoint("https://api.example.com/revisions.json", ["example.com"]);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.host).toBe("api.example.com");
    }

    const invalidScheme = validateRealSourceEndpoint("http://api.example.com/revisions.json", ["example.com"]);
    expect(invalidScheme.ok).toBe(false);
    if (!invalidScheme.ok) {
      expect(invalidScheme.reason).toBe("endpoint_invalid");
    }

    const notAllowed = validateRealSourceEndpoint("https://evil.com/revisions.json", ["example.com"]);
    expect(notAllowed.ok).toBe(false);
    if (!notAllowed.ok) {
      expect(notAllowed.reason).toBe("endpoint_not_allowed");
    }
  });

  it("loadRealRevisionsWithMeta: allowHosts 不一致時は理由付き fallback", async () => {
    const result = await loadRealRevisionsWithMeta({
      endpoint: "https://evil.com/revisions.json",
      allowHosts: ["example.com"],
    });
    expect(result.revisions).toHaveLength(0);
    expect(result.meta.status).toBe("fallback");
    expect(result.meta.reason).toBe("endpoint_not_allowed");
    expect(result.meta.endpointHost).toBe("evil.com");
  });
});
