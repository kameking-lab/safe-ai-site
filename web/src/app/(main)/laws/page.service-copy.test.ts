import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/laws/page.tsx"),
  "utf8",
);
const listSource = readFileSync(
  resolve(process.cwd(), "src/components/law-revision-list.tsx"),
  "utf8",
);

describe("/laws service-first copy", () => {
  it("shows the reform list without method or review-status walls", () => {
    expect(pageSource).not.toContain(">法改正一覧</h2>");
    expect(listSource).toContain(">法改正一覧</h2>");
    expect(pageSource).toContain("<UsageNotesLink");
    expect(`${pageSource}\n${listSource}`).not.toMatch(
      /e-Gov構造データ|機械検証済み|人手確認待ち|法令APIの構造データ/,
    );
  });

  it("shows the practical action before the official-source operation", () => {
    expect(pageSource).toContain('data-primary-result="true"');
    expect(pageSource.indexOf(">今やること</h3>")).toBeLessThan(
      pageSource.indexOf('data-primary-action="true"'),
    );
  });

  it("各カードの原文・要点・質問操作を閉じた詳細へ集約する", () => {
    expect(listSource).toContain("data-law-revision-actions");
    expect(listSource).toContain("詳細・原文");
    expect(listSource).toContain("compactLawRevisionSummary(revision.summary)");
    expect(listSource).not.toContain("expandedDetailId");
    expect(listSource).not.toContain("出典情報を表示");
  });
});
