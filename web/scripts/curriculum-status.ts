#!/usr/bin/env node
/**
 * 無償教材パック 法定対応表レポート生成（企画 02章§3・EDU-D2）。
 *
 * 走り方（web/ で）:
 *   npm run curriculum:status
 *
 * やること: vitest 経由で curriculum-status-probe.test.ts を実行し、
 * docs/education-curriculum-coverage.md（リポジトリ直下 docs/）に
 * 各デッキの法定対応表（科目×範囲×時間×対応スライド番号＋網羅ゲート結果）を再生成する。
 * plain-status.ts と同型（テストを一次ソースにして @/ エイリアス込みで実データを読む）。
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = resolve(webDir, "..");
const mdPath = resolve(repoDir, "docs", "education-curriculum-coverage.md");

const run = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "src/lib/education-curriculum/curriculum-status-probe.test.ts"],
  {
    cwd: webDir,
    env: { ...process.env, CURRICULUM_STATUS_MD: mdPath },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  },
);

if (run.status !== 0) {
  console.error(run.stdout);
  console.error(run.stderr);
  process.exit(run.status ?? 1);
}

console.log(`[curriculum:status] 法定対応表を再生成しました: ${mdPath}`);
