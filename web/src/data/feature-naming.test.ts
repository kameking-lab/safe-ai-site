import { describe, it, expect } from "vitest";
import { FEATURES } from "./features-catalog";
import { FLAGSHIP_FEATURES } from "@/config/flagship-nav";

/**
 * site-wide-audit SW-P0-02 / SW-P2-05 — 命名ファクトチェック。
 *
 * `/safety-diary` の機能は Phase 12 で旧「職長日誌／安全衛生日誌」入力を廃止し、
 * 「安全工程打合せ書」に一本化済み（safety-diary/new/page.tsx 参照）。
 * カタログ・主要機能ナビが旧称「安全衛生日誌」へ逆戻りしないことを保証する。
 *
 * 注: FAQ 本文など「安全施工サイクルとしての安全衛生日誌」を業界一般概念として
 * 説明する記述は対象外（あれは製品名ではなく業界用語の解説）。
 */
describe("feature naming consistency", () => {
  const CANONICAL = "安全工程打合せ書";

  it("features-catalog の safety-diary エントリは正式名（打合せ書）を使う", () => {
    const entry = FEATURES.find((f) => f.slug === "safety-diary");
    expect(entry).toBeDefined();
    expect(entry?.title).toBe(CANONICAL);
    expect(entry?.title).not.toContain("日誌");
    // タグにも旧称「日誌」を残さない
    expect(entry?.tags).not.toContain("日誌");
  });

  it("主要機能ナビ（FLAGSHIP_FEATURES）の safety-diary ラベルは正式名を使う", () => {
    const f = FLAGSHIP_FEATURES.find((x) => x.id === "safety-diary");
    expect(f).toBeDefined();
    expect(f?.label).toBe(CANONICAL);
    expect(f?.href).toBe("/safety-diary");
  });
});
