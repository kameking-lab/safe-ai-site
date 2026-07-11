#!/usr/bin/env node
/**
 * 現場ことば版 カバレッジレポート＋再生成キュー生成。
 *
 * 走り方（web/ で）:
 *   npm run plain:status
 *
 * やること:
 *  1. vitest 経由で plain-status-probe.test.ts を実行し、対象法令ごとの
 *     done / stale / missing を集計（コーパスと plain レジストリの突合）。
 *  2. docs/plain-language-coverage.md（リポジトリ直下 docs/）を再生成。
 *  3. stale（コーパス原文が改正等で更新済み＝要再生成）があれば
 *     BACKLOG-plain-stale.md（リポジトリ直下）を再生成。stale 0 なら
 *     「なし」と書く（幽霊キューを残さない）。
 *
 * 改正追従の流れ:
 *   e-Gov改正 → data班がコーパス条文を更新 → 当該条の sourceTextHash が
 *   不一致になり UI から自動非表示 → 本スクリプトで stale 一覧化 →
 *   plain レーンが再生成して hash を更新 → 表示復帰。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = resolve(webDir, "..");
const jsonPath = resolve(webDir, ".plain-status.json");

const run = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "src/lib/plain/plain-status-probe.test.ts"],
  {
    cwd: webDir,
    env: { ...process.env, PLAIN_STATUS_JSON: jsonPath },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  }
);
if (run.status !== 0) {
  console.error(run.stdout);
  console.error(run.stderr);
  console.error("plain-status-probe が失敗しました（データ不整合の可能性）");
  process.exit(1);
}

type Coverage = {
  lawShort: string;
  egovLawId: string;
  file: string;
  lane: number;
  total: number;
  done: number;
  stale: string[];
  missing: string[];
  orphans: string[];
};
const { generatedAt, coverage } = JSON.parse(readFileSync(jsonPath, "utf8")) as {
  generatedAt: string;
  coverage: Coverage[];
};

const totals = coverage.reduce(
  (acc, c) => ({
    total: acc.total + c.total,
    done: acc.done + c.done,
    stale: acc.stale + c.stale.length,
    missing: acc.missing + c.missing.length,
  }),
  { total: 0, done: 0, stale: 0, missing: 0 }
);

/* ---- docs/plain-language-coverage.md ---- */
const lines: string[] = [
  "# 現場ことば版 カバレッジレポート（安衛法体系）",
  "",
  `生成: ${generatedAt}（\`cd web && npm run plain:status\` で再生成）`,
  "",
  `全体: 収載 ${totals.total} 条 / 言い換え済み(fresh) ${totals.done} 条 / stale ${totals.stale} 条 / 未生成 ${totals.missing} 条`,
  "",
  "| 法令 | e-Gov ID | 収載条数 | 済(fresh) | stale | 未生成 | レーン | データファイル |",
  "|---|---|---|---|---|---|---|---|",
];
for (const c of coverage) {
  lines.push(
    `| ${c.lawShort} | ${c.egovLawId} | ${c.total} | ${c.done} | ${c.stale.length} | ${c.missing.length} | plain-${c.lane} | web/src/data/plain/${c.file}.ts |`
  );
}
lines.push(
  "",
  "- 済(fresh): 言い換え済みで原文ハッシュ一致＝law-navi 条ページに表示中。",
  "- stale: コーパス原文が更新済み（改正反映等）。**UI からは自動で非表示**になっており、再生成キュー（BACKLOG-plain-stale.md）に載る。",
  "- 未生成: 現場ことば版がまだ無い条。区画自体を表示しない（空枠なし）。",
  ""
);
const coveragePath = resolve(repoDir, "docs/plain-language-coverage.md");
mkdirSync(dirname(coveragePath), { recursive: true });
writeFileSync(coveragePath, lines.join("\n"));

/* ---- BACKLOG-plain-stale.md（再生成キュー） ---- */
const staleLines: string[] = [
  "# BACKLOG-plain-stale — 現場ことば版 再生成キュー（自動生成）",
  "",
  `生成: ${generatedAt}。\`cd web && npm run plain:status\` が毎回このファイルを上書きする。`,
  "コーパス原文が更新された条（stale）は UI から自動非表示。ここの条を再生成（言い換え更新＋新ハッシュ転記）して fidelity 緑にすると表示復帰する。",
  "",
];
if (totals.stale === 0) {
  staleLines.push("（現在 stale なし）");
} else {
  for (const c of coverage) {
    for (const num of c.stale) {
      staleLines.push(
        `- [ ] ${c.lawShort} ${num} を再生成（web/src/data/plain/${c.file}.ts。原文とハッシュ: node scripts/plain-source-digest.mjs src/data/laws/${c.file}.ts）`
      );
    }
  }
}
staleLines.push("");
writeFileSync(resolve(repoDir, "BACKLOG-plain-stale.md"), staleLines.join("\n"));

/* ---- コンソール要約 ---- */
console.log(
  `plain:status — 収載${totals.total}条 / fresh ${totals.done} / stale ${totals.stale} / 未生成 ${totals.missing}`
);
for (const c of coverage) {
  const mark = c.done === c.total ? "✅" : c.done > 0 ? "🟡" : "・";
  console.log(
    `${mark} ${c.lawShort.padEnd(8, "　")} ${String(c.done).padStart(3)}/${String(c.total).padStart(3)}` +
      (c.stale.length ? `  stale:${c.stale.length}` : "")
  );
}
console.log("→ docs/plain-language-coverage.md / BACKLOG-plain-stale.md を更新しました");
