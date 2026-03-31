import { describe, expect, it } from "vitest";
import { parseRevisionImportPayload } from "@/lib/revisions-ingest/parse";

describe("revisions-ingest parse", () => {
  it("official-db mapper で lawId/lawTitle 形式を取り込める", () => {
    const records = parseRevisionImportPayload(
      {
        records: [
          {
            lawId: "off-001",
            lawTitle: "公式DBテスト",
            promulgatedAt: "2026-07-01",
            summary: "概要",
            sourceUrl: "https://elaws.e-gov.go.jp/",
            sourceLabel: "e-Gov法令検索",
            sourceIssuer: "デジタル庁",
          },
        ],
      },
      { sourceFormat: "official-db" }
    );
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("off-001");
    expect(records[0].title).toBe("公式DBテスト");
    expect(records[0].publishedAt).toBe("2026-07-01");
    expect(records[0].source?.label).toBe("e-Gov法令検索");
  });

  it("未知の sourceFormat は default mapper にフォールバックする", () => {
    const records = parseRevisionImportPayload(
      [
        {
          id: "d-001",
          title: "default fallback",
          published_at: "2026-08-01",
          summary: "概要",
        },
      ],
      { sourceFormat: "unknown-format" }
    );
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("d-001");
    expect(records[0].title).toBe("default fallback");
  });
});
