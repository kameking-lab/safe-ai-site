import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { SOURCE_REGISTRY } from "./source-registry";

describe("SOURCE_REGISTRY", () => {
  it("公開レコードは一意ID・HTTPS URL・必須追跡項目を持つ", () => {
    expect(new Set(SOURCE_REGISTRY.map((source) => source.id)).size).toBe(
      SOURCE_REGISTRY.length,
    );

    for (const source of SOURCE_REGISTRY) {
      expect(source.officialName.trim()).not.toBe("");
      expect(source.publisher.trim()).not.toBe("");
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(Array.isArray(source.appliesTo)).toBe(true);
      expect(source.appliesTo.length).toBeGreaterThan(0);
      expect(source).toHaveProperty("documentNumber");
      expect(source).toHaveProperty("verifiedAt");
      expect(source).toHaveProperty("hash");
      expect(source).toHaveProperty("successorUrl");
      expect(source).toHaveProperty("reviewer");
    }
  });

  it("URL到達確認だけのレコードを人手内容確認済みにしない", () => {
    for (const source of SOURCE_REGISTRY.filter(
      (entry) => entry.status === "urlConfirmed",
    )) {
      expect(source.verifiedAt).toBeNull();
      expect(source.reviewer).toBeNull();
      expect(source.hash).toBeNull();
    }
  });

  it("byte snapshotだけのレコードを専門・法務確認済みとは扱わない", () => {
    for (const source of SOURCE_REGISTRY.filter(
      (entry) =>
        entry.status === "snapshotConfirmed" &&
        entry.id !== "mhlw-heat-notice-0520-6",
    )) {
      expect(source.verifiedAt).toBeNull();
      expect(source.reviewer).toBeNull();
      expect(source.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("基発0520第6号は2026-08-02独立一次資料照合を記録し、専門・法務監修と区別する", () => {
    const source = SOURCE_REGISTRY.find(
      (entry) => entry.id === "mhlw-heat-notice-0520-6",
    );
    expect(source).toMatchObject({
      officialName: "労働安全衛生規則の一部を改正する省令の施行等について",
      publisher: "厚生労働省",
      documentNumber: "基発0520第6号",
      url: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
      verifiedAt: "2026-08-02",
      hash:
        "73f5bd365128cf6a033293b6d2e64bbbd469bf38bed1a3e0e73a2a9d3d688615",
      status: "snapshotConfirmed",
      reviewer: "独立一次資料照合（専門・法務監修ではない）",
    });
    expect(source?.note).toContain("32頁");
    expect(source?.note).toContain("PDF 2ページの該当抜粋");
    expect(source?.note).toContain("専門・法務監修は未実施");
  });

  it("公開runtimeレジストリと監査CSVのrecord_idを一致させる", () => {
    const csv = readFileSync(
      resolve(
        process.cwd(),
        "../docs/audits/source-coverage-registry-2026-07-24.csv",
      ),
      "utf8",
    );
    const csvIds = csv
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => /^"([^"]+)"/.exec(line)?.[1])
      .filter((id): id is string => Boolean(id))
      .sort();
    const runtimeIds = SOURCE_REGISTRY.filter(
      (source) => source.disclosure === "public",
    )
      .map((source) => source.id)
      .sort();

    expect(runtimeIds).toEqual(csvIds);
  });
});
