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
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
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
  retrieval_total?: number;
  retrieval_correct?: number;
  retrieval_accuracy?: number;
  safe_hold_total?: number;
  safe_hold_correct?: number;
  safe_hold_rate?: number;
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
const outPath = resolve(
  root,
  process.env.CHATBOT_EVAL_OUT || "src/data/chatbot-eval-results.json",
);

console.log("[chatbot-eval] vitest run rag-100q.test + chatbot-phase2-metrics.test 実行中…");
const proc = spawnSync(
  vitestBin,
  ["run", "rag-100q.test", "chatbot-phase2-metrics.test", "--reporter=verbose"],
  {
    cwd: root,
    encoding: "utf8",
    shell: isWindows,
    env: { ...process.env, RAG_100Q_REPORT_PATH: outPath },
  }
);

const out = (proc.stdout ?? "") + "\n" + (proc.stderr ?? "");
if (proc.status !== 0) {
  console.error("[chatbot-eval] 評価テストが失敗しました:");
  console.error(out.slice(-2000));
  process.exit(1);
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

let result: EvalResult;
try {
  result = JSON.parse(readFileSync(outPath, "utf8")) as EvalResult;
} catch {
  console.error(
    "[chatbot-eval] rag-100q.test が生成する実測JSONを読み取れませんでした。",
  );
  process.exit(1);
}
result = {
  ...result,
  phase2,
  passed:
    result.passed &&
    (result.safe_hold_total === undefined ||
      result.safe_hold_correct === result.safe_hold_total),
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(
  `[chatbot-eval] 条文検索 ${result.retrieval_correct ?? result.correct}/` +
    `${result.retrieval_total ?? result.total} = ` +
    `${((result.retrieval_accuracy ?? result.accuracy) * 100).toFixed(1)}%` +
    ` / 安全保留 ${result.safe_hold_correct ?? 0}/${result.safe_hold_total ?? 0}` +
    ` -> ${outPath}`,
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
