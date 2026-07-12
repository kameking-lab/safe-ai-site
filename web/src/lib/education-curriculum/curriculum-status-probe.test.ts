/**
 * `npm run curriculum:status`（scripts/curriculum-status.ts）の内部プローブ。
 *
 * plain-status-probe と同型: vitest 経由で @/ エイリアス込みの実データを読み、
 * 宣言デッキの法定対応表（科目×範囲×時間×対応スライド番号）Markdown を生成する。
 * このテスト自体は集計の健全性のみ検査（網羅ゲート本体は curriculum-coverage.test.ts）。
 * 環境変数 CURRICULUM_STATUS_MD にパスが入っていれば Markdown を書き出す。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCoverageReport, checkCurriculumCoverage } from "./coverage";
import { getCurriculum } from "@/data/education-curriculum";
import { EDUCATION_DECKS } from "@/data/education-decks";

function toMarkdown(): string {
  const lines: string[] = [];
  lines.push("# 無償教材パック 法定対応表（自動生成）");
  lines.push("");
  lines.push(
    "本表は各デッキと正本カリキュラムレジストリの機械照合（`npm run curriculum:test`）で常時検証される。",
  );
  lines.push("誇大宣伝ではなく検証事実のみを記載する。");
  lines.push("");
  for (const deck of EDUCATION_DECKS) {
    const curriculum = getCurriculum(deck.curriculumId);
    if (!curriculum) continue;
    const violations = checkCurriculumCoverage(curriculum, deck.trackId, deck);
    const rows = buildCoverageReport(curriculum, deck.trackId, deck);
    lines.push(`## ${deck.title}`);
    lines.push("");
    lines.push(`- 根拠: ${deck.basisDisplay}`);
    lines.push(`- 正本: ${curriculum.basis.kokuji}`);
    lines.push(`- 出典: ${curriculum.basis.sourceUrl}（${curriculum.basis.retrievedOn} 確認）`);
    lines.push(`- 網羅ゲート: ${violations.length === 0 ? "✅ 緑（違反0）" : `❌ 違反${violations.length}件`}`);
    lines.push("");
    lines.push("| 区分 | 科目 | 範囲 | 時間 | 対応スライド |");
    lines.push("|---|---|---|---:|---|");
    for (const r of rows) {
      const bunrui = r.kind === "gakka" ? "学科" : "実技";
      const slides =
        r.kind === "jitsugi" ? "対面実施（教材で代替不可）" : r.slideNumbers.map((n) => `#${n}`).join(" ") || "—";
      lines.push(
        `| ${bunrui} | ${r.subject} | ${r.scopeItem} | ${r.minHours}h | ${slides} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

describe("curriculum カバレッジ集計", () => {
  it("宣言デッキが全て正本を参照し、対応表が生成できる", () => {
    for (const deck of EDUCATION_DECKS) {
      const curriculum = getCurriculum(deck.curriculumId);
      expect(curriculum, `${deck.slug} の正本未解決`).toBeDefined();
      const rows = buildCoverageReport(curriculum!, deck.trackId, deck);
      expect(rows.length, `${deck.slug} の対応表が空`).toBeGreaterThan(0);
    }
    const out = process.env.CURRICULUM_STATUS_MD;
    if (out) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, toMarkdown());
    }
  });
});
