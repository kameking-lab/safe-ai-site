import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MHLW_HEAT_NOTICE_0520_6_SNAPSHOT as snapshot } from "./mhlw-heat-notice-0520-6";

const SOURCE_PDF = resolve(
  process.cwd(),
  "src/data/source-snapshots/mhlw-kihatsu-0520-6-2025-05-20.pdf",
);

const sha256 = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");

const normalizePdfText = (value: string) =>
  value.normalize("NFKC").replace(/\s+/gu, "");

describe("基発0520第6号 公式PDF snapshot", () => {
  it("公式掲載情報と独立一次資料照合の範囲を固定する", () => {
    expect(snapshot).toMatchObject({
      documentNumber: "基発0520第6号",
      title: "労働安全衛生規則の一部を改正する省令の施行等について",
      publisher: "厚生労働省",
      issuer: "厚生労働省労働基準局長",
      publishedAt: "2025-05-20",
      landingUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      url: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
      locator: "PDF 2ページ 第3 1(1)イ",
      pdfPages: 32,
      independentPrimarySourceReview: {
        reviewedAt: "2026-08-02",
        status: "matched",
        method: "独立一次資料照合",
        humanLegalReviewStatus: "not-reviewed",
      },
      humanReviewStatus: "not-reviewed",
    });
    expect(snapshot.independentPrimarySourceReview.scope).toContain("bytes");
    expect(snapshot.independentPrimarySourceReview.scope).toContain("SHA-256");
    expect(snapshot.independentPrimarySourceReview.scope).toContain(
      "PDF 2ページ",
    );
  });

  it("保存した公式PDFのbytesとSHA-256を固定する", () => {
    const pdf = readFileSync(SOURCE_PDF);
    expect(pdf.byteLength).toBe(snapshot.pdfBytes);
    expect(sha256(pdf)).toBe(snapshot.pdfSha256);
    expect(sha256(snapshot.excerpt)).toBe(snapshot.excerptSha256);
  });

  it(
    "PDF 2ページの一次本文がWBGT・気温・時間条件をすべて支持する",
    async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf = await pdfjs.getDocument({
        data: new Uint8Array(readFileSync(SOURCE_PDF)),
        useWorkerFetch: false,
      }).promise;
      expect(pdf.numPages).toBe(snapshot.pdfPages);

      const page = await pdf.getPage(2);
      const content = await page.getTextContent();
      const extracted = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      expect(normalizePdfText(extracted)).toContain(
        normalizePdfText(snapshot.excerpt),
      );
      for (const required of ["WBGT", "28", "31", "1時間", "4時間"]) {
        expect(normalizePdfText(snapshot.excerpt)).toContain(
          normalizePdfText(required),
        );
      }
    },
    30_000,
  );
});
