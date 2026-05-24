#!/usr/bin/env node
/**
 * チャットボット 100 問精度評価。
 *
 * 走り方:
 *   node --experimental-strip-types scripts/chatbot-eval.ts
 *   （Node 22 以降、もしくは Node 24+ の標準フラグ無し実行でも可）
 *
 * 内部的には vitest run rag-100q.test を起動し、stdout から正答数を抽出。
 * 結果は web/src/data/chatbot-eval-results.json に書き出され、
 * /about/chatbot-eval ページが SSG で読み出して公開する。
 *
 * 設計理由: 評価ロジックを rag-100q.test.ts と二重実装しないため、
 * vitest の結果を一次ソースにし、本スクリプトは集計と JSON 出力に専念する。
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

type Failure = { id: number; topic: string; question: string; expected: string; actual: string };
type Phase2Metrics = {
  /** top-1 が gold セットに含まれる率（Citation Accuracy@1） */
  citation_at1?: number;
  /** Layer 1 が同梱したホワイトリスト平均サイズ */
  layer1_avg_whitelist?: number;
  /** Layer 2 False Positive Rate（自分の引用を弾く率） */
  layer2_fp_rate?: number;
  /** Hallucination Detection Rate（架空条文を検出する率） */
  hallucination_detection_rate?: number;
};
type EvalResult = {
  generated_at: string;
  total: number;
  correct: number;
  accuracy: number;
  target: number;
  passed: boolean;
  failures: Failure[];
  topic_breakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  phase2?: Phase2Metrics;
};

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const isWindows = process.platform === "win32";
const vitestBin = resolve(
  root,
  isWindows ? "node_modules/.bin/vitest.cmd" : "node_modules/.bin/vitest"
);

console.log("[chatbot-eval] vitest run rag-100q.test + chatbot-phase2-metrics.test 実行中…");
const proc = spawnSync(
  vitestBin,
  ["run", "rag-100q.test", "chatbot-phase2-metrics.test", "--reporter=verbose"],
  { cwd: root, encoding: "utf8", shell: isWindows }
);

const out = (proc.stdout ?? "") + "\n" + (proc.stderr ?? "");

// "[RAG 100Q] 正答 X/Y = Z%" 行を抽出
const summary = out.match(/\[RAG 100Q\] 正答 (\d+)\/(\d+) = ([\d.]+)%/);
if (!summary) {
  console.error("[chatbot-eval] vitest 出力から集計行を抽出できませんでした:");
  console.error(out.slice(-2000));
  process.exit(1);
}
const correct = Number(summary[1]);
const total = Number(summary[2]);
const accuracy = correct / total;

// 失敗ケースを抽出
const failures: Failure[] = [];
const failBlock = out.split(/\[RAG 100Q\] 不正答 \d+ 件:/)[1] ?? "";
const failLines = failBlock.split("\n");
for (let i = 0; i < failLines.length; i++) {
  const head = failLines[i].match(/Q(\d+) \[(.+?)\] (.+)/);
  if (!head) continue;
  const id = Number(head[1]);
  const topic = head[2];
  const question = head[3];
  const expected = (failLines[i + 1] ?? "").replace(/^\s*期待:\s*/, "").trim();
  const actual = (failLines[i + 2] ?? "").replace(/^\s*取得:\s*/, "").trim();
  failures.push({ id, topic, question, expected, actual });
}

// fixture から topic ブレークダウン用の元データ取得
const fixtureJsonPath = resolve(root, "test/chatbot-basic-100.json");
const fixture = JSON.parse(readFileSync(fixtureJsonPath, "utf8")) as {
  questions: Array<{ id: number; topic: string }>;
};
const failedIds = new Set(failures.map((f) => f.id));
const topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {};
for (const q of fixture.questions) {
  const slot = (topicBreakdown[q.topic] ??= { total: 0, correct: 0, accuracy: 0 });
  slot.total += 1;
  if (!failedIds.has(q.id)) slot.correct += 1;
}
for (const t of Object.values(topicBreakdown)) {
  t.accuracy = t.total === 0 ? 0 : t.correct / t.total;
}

// Phase 2 メトリクス抽出（vitest stdout から）
function extractFloat(text: string, regex: RegExp): number | undefined {
  const m = text.match(regex);
  return m ? Number(m[1]) : undefined;
}
const citationAt1Pct = extractFloat(out, /Citation Accuracy@1: \d+\/\d+ = ([\d.]+)%/);
const layer1Avg = extractFloat(out, /Layer 1 平均ホワイトリスト密度: ([\d.]+) 条文\/問/);
const fpRatePct = extractFloat(out, /Layer 2 False Positive Rate: \d+\/\d+ = ([\d.]+)%/);
const halDetectPct = extractFloat(out, /Hallucination Detection Rate: \d+\/\d+ = ([\d.]+)%/);
const phase2: Phase2Metrics = {
  citation_at1: citationAt1Pct !== undefined ? citationAt1Pct / 100 : undefined,
  layer1_avg_whitelist: layer1Avg,
  layer2_fp_rate: fpRatePct !== undefined ? fpRatePct / 100 : undefined,
  hallucination_detection_rate: halDetectPct !== undefined ? halDetectPct / 100 : undefined,
};

const TARGET = 0.8;
const result: EvalResult = {
  generated_at: new Date().toISOString(),
  total,
  correct,
  accuracy,
  target: TARGET,
  passed: accuracy >= TARGET,
  failures,
  topic_breakdown: topicBreakdown,
  phase2,
};

const outPath = resolve(root, "src/data/chatbot-eval-results.json");
writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(
  `[chatbot-eval] ${correct}/${total} = ${(accuracy * 100).toFixed(1)}% (target ${TARGET * 100}%) -> ${outPath}`
);
if (phase2.citation_at1 !== undefined) {
  console.log(
    `[chatbot-eval] Phase 2 - Citation@1: ${(phase2.citation_at1 * 100).toFixed(1)}%, ` +
      `Layer1 avg whitelist: ${phase2.layer1_avg_whitelist?.toFixed(1) ?? "?"}, ` +
      `Layer2 FP: ${(phase2.layer2_fp_rate ?? 0) * 100}%, ` +
      `Hallucination Detection: ${(phase2.hallucination_detection_rate ?? 0) * 100}%`
  );
}

if (!result.passed) {
  console.error("[chatbot-eval] 目標未達");
  process.exit(2);
}
