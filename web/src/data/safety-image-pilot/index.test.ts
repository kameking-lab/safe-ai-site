import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import generationRecord from "./generation-record.json";
import qa from "./qa.json";
import {
  DIRECT_TEXT_IS_EXACT,
  PILOT_LANGUAGES,
  PILOT_MANIFEST,
  PILOT_TEXTS,
  pilotDownloadUrl,
} from "./index";

const expectedTexts = {
  ja: "保護帽を着用",
  en: "WEAR A SAFETY HELMET",
  vi: "ĐỘI MŨ BẢO HỘ",
  "zh-CN": "佩戴安全帽",
  id: "GUNAKAN HELM KESELAMATAN",
} as const;

describe("safety image pilot manifest", () => {
  it("keeps method B isolated to the one approved comparison pilot", () => {
    expect(PILOT_MANIFEST.publicImageCount).toBe(1);
    expect(PILOT_MANIFEST.status).toBe("pilot-comparison");
    expect(PILOT_MANIFEST.includedInSitemap).toBe(false);
    expect(PILOT_MANIFEST.robots).toBe("noindex,follow");
    expect(generationRecord.generationCount).toBe(2);
    expect(generationRecord.additionalCorrectionUsed).toBe(false);
    expect(existsSync(join(process.cwd(), "src/data/safety-image-library"))).toBe(true);
    expect(existsSync(join(process.cwd(), "public/safety-images/library/previews"))).toBe(true);
  });

  it("keeps all method A strings byte-exact", () => {
    expect(PILOT_LANGUAGES).toEqual(["all", "ja", "en", "vi", "zh-CN", "id"]);
    expect(PILOT_TEXTS.all).toEqual(Object.values(expectedTexts));
    for (const [language, text] of Object.entries(expectedTexts)) {
      expect(PILOT_TEXTS[language as keyof typeof expectedTexts]).toBe(text);
    }
  });

  it("preserves both imagegen originals byte-for-byte with recorded checksums", () => {
    for (const source of [PILOT_MANIFEST.cleanMaster, PILOT_MANIFEST.directTextOriginal]) {
      const absolute = join(process.cwd(), source.file);
      const digest = createHash("sha256").update(readFileSync(absolute)).digest("hex");
      expect(source.untouched).toBe(true);
      expect(digest).toBe(source.sha256);
    }
  });

  it("allows method B download only after five-language visual approval", () => {
    expect(DIRECT_TEXT_IS_EXACT).toBe(true);
    expect(qa.directText.downloadPolicy).toBe("comparison-download-allowed");
    for (const result of Object.values(expectedTexts).map((_, index) =>
      Object.values(qa.directText).filter(
        (value): value is { expected: string; visualResult: string } =>
          typeof value === "object" && value !== null && "expected" in value,
      )[index],
    )) {
      expect(result.visualResult).toBe("exact");
    }
    expect(
      pilotDownloadUrl({
        variant: "b",
        language: "ja",
        brand: "clean",
        paper: "A4",
        format: "jpeg",
      }),
    ).toContain("variant=b&lang=all");
  });
});
