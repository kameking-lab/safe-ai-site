import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { expect, it } from "vitest";

function compact(row: Record<string, unknown>): Record<string, unknown> {
  const script = pathToFileURL(resolve(process.cwd(), "../scripts/etl/build-laws-compact.mjs")).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import { compactLawRecord } from ${JSON.stringify(script)}; console.log(JSON.stringify(compactLawRecord(${JSON.stringify(row)})));`], { encoding: "utf8", windowsHide: true });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}
const row = { articleNumber: "第1条", sourceFile: "unknown.pdf", page: 1, text: "実際に取り込んだ条文本文をそのまま保持する検査。" };

it("preserves explicitly supplied source facts through the next compact import", () => {
  const facts = { sourceUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf", sourceLawId: "347M50002000032", sourceRevisionId: "20261001_508M60000100116", sourceFetchedAt: "2026-10-08T13:28:36.662Z", sourceHash: "a".repeat(64) };
  const result = compact({ ...row, ...facts });
  for (const [key, value] of Object.entries(facts)) expect(result[key]).toBe(value);
  expect(result.text).toBe(row.text);
  expect(result.verificationStatus).toBeUndefined();
});

it("does not synthesize missing source facts from the file name or generation date", () => {
  const result = compact({ ...row, sourceFile: "2026-10-13.pdf", generatedAt: "2026-10-13T00:00:00Z" });
  for (const key of ["sourceUrl", "sourceRevisionId", "sourceFetchedAt", "sourceHash", "checkedAt"]) expect(result[key]).toBeUndefined();
});

it.each(["2026-02-31", "2026-10-11T24:00:00Z"])("keeps a valid source URL while rejecting an impossible supplied date: %s", (date) => {
  const result = compact({ ...row, sourceUrl: "https://www.mhlw.go.jp/", sourceFetchedAt: date });
  expect(result.sourceUrl).toBe("https://www.mhlw.go.jp/");
  expect(result.sourceFetchedAt).toBeUndefined();
});

it("keeps the formal full e-Gov revision ID unchanged during compact import", () => {
  const version = "339AC0000000170_20260803_508AC0000000068";
  expect(compact({ ...row, sourceRevisionId: version }).sourceRevisionId).toBe(version);
});
