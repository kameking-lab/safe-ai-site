// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sources = [
  "../docs/content-quality-audit-2026-05-16.md",
  "../docs/post-2week-regression-audit-2026-05-18.md",
  "../docs/site-status-2026-05-19/report.md",
  "src/app/admin/audits/post-2week-regression/page.tsx",
];

describe("SEC3-H6 legacy authentication credentials", () => {
  it.each(sources)("does not republish a historical credential in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    const assignments = [...source.matchAll(/\b[A-Za-z_]*(?:VALID_KEY|PASSWORD)\s*=\s*["']([^"'\r\n]{8,})["']/g)];
    // Report only locations: assertion output must never contain credential values.
    const unredactedLines = assignments
      .filter(match => !/redacted|伏字|伏せ字|非表示|削除済/i.test(match[1]))
      .map(match => source.slice(0, match.index).split("\n").length);
    expect(unredactedLines).toEqual([]);
  });
});
