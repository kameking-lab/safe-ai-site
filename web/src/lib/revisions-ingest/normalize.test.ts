import { describe, expect, it } from "vitest";
import { normalizeRevisionRecord, normalizeRevisionRecords } from "@/lib/revisions-ingest/normalize";
import type { RevisionImportRecord } from "@/lib/revisions-ingest/types";

describe("revisions-ingest normalize", () => {
  it("source.url が不正な場合は空文字へフォールバックする", () => {
    const record: RevisionImportRecord = {
      id: "r-1",
      title: "テスト法改正",
      publishedAt: "2026-03-30",
      revisionNumber: "第1号",
      kind: "ordinance",
      category: "省令",
      issuer: "厚労省",
      summary: "概要",
      source: {
        url: "javascript:alert(1)",
        label: "不正URL",
      },
    };

    const normalized = normalizeRevisionRecord(record);
    expect(normalized.source?.url).toBe("");
    expect(normalized.source?.label).toBe("不正URL");
  });

  it("issuer/kind/revisionNumber の欠損を補完する", () => {
    const record: RevisionImportRecord = {
      id: "r-2",
      title: "補完テスト",
      publishedAt: null,
      revisionNumber: null,
      kind: null,
      category: null,
      issuer: null,
      summary: null,
      source: {
        url: null,
        label: null,
        issuer: "source issuer",
      },
    };

    const normalized = normalizeRevisionRecord(record);
    expect(normalized.kind).toBe("other");
    expect(normalized.issuer).toBe("source issuer");
    expect(normalized.publishedAt).toBe("1970-01-01");
    expect(normalized.revisionNumber).toBe("1970-01-01 other 未設定");
    expect(normalized.summary).toBe("概要未設定");
    expect(normalized.category).toBe("通達");
    expect(normalized.source?.label).toBe("source issuer");
  });

  it("official-db由来メタ情報で publishedAt/kind/revisionNumber/issuer を補完できる", () => {
    const record: RevisionImportRecord = {
      id: "r-meta-1",
      title: "official-db補完テスト",
      publishedAt: "2026-01-01",
      revisionNumber: null,
      kind: null,
      category: null,
      issuer: null,
      summary: "概要",
      source: {
        url: "https://elaws.e-gov.go.jp/",
        label: "e-Gov法令検索",
        issuer: "デジタル庁",
      },
      meta: {
        effectiveDate: "2026-02-01",
        amendmentType: "省令改正",
        lawNumber: "令和8年 省令 第1号",
        issuedBy: "厚生労働省",
      },
    };

    const normalized = normalizeRevisionRecord(record);
    expect(normalized.publishedAt).toBe("2026-02-01");
    expect(normalized.kind).toBe("ordinance");
    expect(normalized.category).toBe("省令");
    expect(normalized.revisionNumber).toBe("令和8年 省令 第1号");
    expect(normalized.issuer).toBe("厚生労働省");
  });

  it("id/title があるレコードのみ残し、source欠損が混在しても落ちない", () => {
    const records: RevisionImportRecord[] = [
      {
        id: "r-3",
        title: "有効データ1",
        publishedAt: "2026-01-01",
        summary: "概要1",
      },
      {
        id: "",
        title: "無効データ",
        publishedAt: "2026-01-01",
        summary: "概要2",
      },
      {
        id: "r-4",
        title: "有効データ2",
        publishedAt: "2026-02-01",
        summary: "概要3",
        source: null,
      },
    ];

    const normalized = normalizeRevisionRecords(records);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].source?.label).toBeDefined();
    expect(normalized[1].source?.label).toBeDefined();
  });
});
